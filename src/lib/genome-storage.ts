import { Storage } from '@google-cloud/storage';
import { prisma } from '@/lib/prisma';

/**
 * Storage service for raw genome variant files (VCF / .vcf.gz).
 *
 * These are the per-child files that power the Fore Explore product. They are
 * kept in a separate bucket from PDF reports because they are large and
 * especially sensitive. Access is always brokered through a short-lived V4
 * signed URL generated server-side after an ownership check — the file is never
 * public.
 *
 * IMPORTANT: genome objects must be stored as opaque gzip blobs
 * (contentType `application/gzip`, NO `Content-Encoding: gzip` metadata) so the
 * browser hands Explore the raw compressed bytes. Explore decompresses them
 * itself via `DecompressionStream("gzip")`; if GCS advertised Content-Encoding
 * the browser would transparently decompress and Explore's decompression would
 * then fail.
 */
class GenomeStorageService {
	private storage: Storage;
	private bucketName: string;

	constructor() {
		const credentials = {
			type: 'service_account',
			project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
			private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
			private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(/\\n/g, '\n'),
			client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
			client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
			auth_uri: 'https://accounts.google.com/o/oauth2/auth',
			token_uri: 'https://oauth2.googleapis.com/token',
			auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
			client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL,
		};

		this.storage = new Storage({
			projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
			credentials,
		});

		this.bucketName =
			process.env.GOOGLE_CLOUD_GENOME_BUCKET || 'fore-genomics-genomes';
	}

	/** Preserve the full .vcf.gz double extension where present. */
	private getExtension(fileName: string): string {
		const lower = fileName.toLowerCase();
		if (lower.endsWith('.vcf.gz')) return 'vcf.gz';
		if (lower.endsWith('.vcf')) return 'vcf';
		return fileName.split('.').pop() || 'vcf.gz';
	}

	/**
	 * Create a short-lived V4 signed URL the lab/admin browser can PUT the raw
	 * genome file to directly, bypassing the app server (same rationale as
	 * report uploads: Vercel serverless functions cap request bodies well below
	 * the size of a whole-genome VCF).
	 *
	 * The bucket must have a CORS policy allowing PUT from the app origin
	 * (see cors.json). The returned `fileName` should be persisted on
	 * `Kit.genomeDataFileName`.
	 */
	async createGenomeUploadUrl(
		kitId: string,
		originalFileName: string,
		contentType = 'application/gzip'
	): Promise<{ uploadUrl: string; fileName: string; contentType: string }> {
		const kit = await prisma.kit.findUnique({
			where: { id: kitId },
			include: { order: true },
		});
		if (!kit) throw new Error('Kit not found');

		const kitNumberSuffix = kit.kitNumber ? `-${kit.kitNumber}` : '';
		const date = new Date().toISOString().split('T')[0];
		const ext = this.getExtension(originalFileName);
		const isProduction = process.env.NODE_ENV === 'production';
		const fileName = isProduction
			? `${kit.order.orderNumber}${kitNumberSuffix}-${date}-genome.${ext}`
			: `test/${kit.order.orderNumber}${kitNumberSuffix}-${date}-genome.${ext}`;

		const normalizedContentType = contentType || 'application/gzip';
		const fileObj = this.storage.bucket(this.bucketName).file(fileName);

		const [uploadUrl] = await fileObj.getSignedUrl({
			version: 'v4',
			action: 'write',
			expires: Date.now() + 15 * 60 * 1000, // 15 minutes
			contentType: normalizedContentType,
		});

		return { uploadUrl, fileName, contentType: normalizedContentType };
	}

	/**
	 * Generate a short-lived V4 signed READ URL for a stored genome file.
	 * Kept intentionally short (1 hour) because the payload is sensitive raw
	 * genetic data — Explore fetches it once at load time.
	 */
	async getGenomeUrl(fileName: string): Promise<string> {
		try {
			const fileObj = this.storage.bucket(this.bucketName).file(fileName);
			const [signedUrl] = await fileObj.getSignedUrl({
				version: 'v4',
				action: 'read',
				expires: Date.now() + 60 * 60 * 1000, // 1 hour
			});
			return signedUrl;
		} catch (error) {
			throw new Error('Failed to generate genome URL');
		}
	}

	/** Whether a stored genome object actually exists in the bucket. */
	async genomeExists(fileName: string): Promise<boolean> {
		try {
			const [exists] = await this.storage
				.bucket(this.bucketName)
				.file(fileName)
				.exists();
			return exists;
		} catch {
			return false;
		}
	}

	async deleteGenome(fileName: string): Promise<void> {
		try {
			await this.storage.bucket(this.bucketName).file(fileName).delete();
		} catch (error) {
			throw new Error('Failed to delete genome file');
		}
	}
}

// Export singleton instance
export const genomeStorageService = new GenomeStorageService();
