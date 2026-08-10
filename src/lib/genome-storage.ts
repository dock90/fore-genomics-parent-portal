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
/**
 * A genome object larger than this is refused rather than linked to a kit.
 * Whole-genome VCFs are large, but an object this size is far likelier to be a
 * mis-selected archive than a variant file, and Explore has to stream it into a
 * parent's browser.
 */
export const MAX_GENOME_BYTES = 4 * 1024 * 1024 * 1024;

/** Enough bytes to see a gzip member header or the VCF format line. */
const GENOME_SNIFF_BYTES = 4096;

export type GenomeValidation =
	| { ok: true; bytes: number; encoding: 'gzip' | 'plain' }
	| { ok: false; reason: string };

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
	 * Object name for a kit's genome, e.g. `ORD-133664-621-1-2026-07-29-genome.vcf.gz`.
	 * Non-production uploads are prefixed `test/` so they never sit alongside
	 * real families' data.
	 */
	private async genomeObjectName(
		kitId: string,
		originalFileName: string
	): Promise<string> {
		const kit = await prisma.kit.findUnique({
			where: { id: kitId },
			include: { order: true },
		});
		if (!kit) throw new Error('Kit not found');

		const kitNumberSuffix = kit.kitNumber ? `-${kit.kitNumber}` : '';
		const date = new Date().toISOString().split('T')[0];
		const ext = this.getExtension(originalFileName);
		const base = `${kit.order.orderNumber}${kitNumberSuffix}-${date}-genome.${ext}`;
		return process.env.NODE_ENV === 'production' ? base : `test/${base}`;
	}

	/**
	 * Open a **resumable** upload session for a kit's genome and hand the session
	 * URI to the browser, which uploads the file in chunks directly to GCS.
	 *
	 * Why resumable rather than one signed PUT:
	 *
	 *  - A whole-genome VCF is 200MB+. A single request has no recovery — one
	 *    dropped packet and the whole transfer restarts from zero, which is
	 *    indistinguishable from "the file is too big to upload".
	 *  - A V4 signed URL expires (ours was 15 minutes). On a slow uplink a large
	 *    file can outlive its own URL and fail at 90% with a 403.
	 *  - A resumable session lasts **7 days** and can be queried for how many
	 *    bytes GCS actually committed, so an interrupted upload continues from
	 *    that offset instead of starting again.
	 *
	 * `origin` must be passed: GCS binds the session to it and returns the CORS
	 * headers the browser needs for the subsequent chunk PUTs. The bucket also
	 * needs PUT plus the `Content-Range` header allowed (see cors.json).
	 *
	 * The file body never touches our server, so Vercel's 4.5MB request-body
	 * ceiling is irrelevant on this path — raising `bodySizeLimit` would do
	 * nothing for genome uploads.
	 */
	async createResumableGenomeUpload(
		kitId: string,
		originalFileName: string,
		contentType = 'application/gzip',
		origin?: string
	): Promise<{ sessionUrl: string; fileName: string; contentType: string }> {
		const fileName = await this.genomeObjectName(kitId, originalFileName);
		const normalizedContentType = contentType || 'application/gzip';
		const fileObj = this.storage.bucket(this.bucketName).file(fileName);

		// Fail loudly and specifically if the bucket is missing — that produced a
		// bare 404 on upload for months and read as a file-size problem.
		const [bucketExists] = await this.storage.bucket(this.bucketName).exists();
		if (!bucketExists) {
			throw new Error(
				`Genome bucket "${this.bucketName}" does not exist. Create it and set GOOGLE_CLOUD_GENOME_BUCKET.`
			);
		}

		const [sessionUrl] = await fileObj.createResumableUpload({
			origin,
			metadata: {
				contentType: normalizedContentType,
				// Explore decompresses the gzip itself, so the object must stay an
				// opaque blob — never advertise Content-Encoding here.
				metadata: { kitId, originalFileName },
			},
		});

		return { sessionUrl, fileName, contentType: normalizedContentType };
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

	/** Read the leading bytes of a stored object without buffering the whole file. */
	private async readHead(fileName: string, bytes: number): Promise<Buffer> {
		const fileObj = this.storage.bucket(this.bucketName).file(fileName);
		const chunks: Buffer[] = [];
		await new Promise<void>((resolve, reject) => {
			const stream = fileObj.createReadStream({ start: 0, end: bytes - 1 });
			stream.on('data', (c: Buffer) => chunks.push(c));
			stream.on('end', () => resolve());
			stream.on('error', reject);
		});
		return Buffer.concat(chunks);
	}

	/**
	 * Confirm a stored object is actually a usable variant file before it becomes
	 * a child's result source.
	 *
	 * Linking the DB pointer on the strength of the upload alone meant a truncated
	 * transfer, a zero-byte object, or an unrelated file could silently become the
	 * input Explore interprets and shows to a parent. The extension is caller-
	 * supplied and proves nothing, so the bytes are sniffed here: gzip members
	 * start `1f 8b`, and a plain VCF must open with its mandatory `##fileformat`
	 * line. Anything else is refused.
	 */
	async validateGenomeObject(fileName: string): Promise<GenomeValidation> {
		let bytes: number;
		try {
			const [metadata] = await this.storage
				.bucket(this.bucketName)
				.file(fileName)
				.getMetadata();
			bytes = Number(metadata.size ?? 0);
		} catch {
			return { ok: false, reason: 'The uploaded genome file could not be found in storage.' };
		}

		if (!bytes) {
			return { ok: false, reason: 'The uploaded genome file is empty.' };
		}
		if (bytes > MAX_GENOME_BYTES) {
			return {
				ok: false,
				reason: `The uploaded genome file is larger than the ${Math.round(
					MAX_GENOME_BYTES / (1024 * 1024 * 1024)
				)}GB limit.`,
			};
		}

		let head: Buffer;
		try {
			head = await this.readHead(fileName, Math.min(GENOME_SNIFF_BYTES, bytes));
		} catch {
			return { ok: false, reason: 'The uploaded genome file could not be read back from storage.' };
		}

		if (head.length >= 2 && head[0] === 0x1f && head[1] === 0x8b) {
			return { ok: true, bytes, encoding: 'gzip' };
		}
		if (head.toString('utf8').trimStart().startsWith('##fileformat=VCF')) {
			return { ok: true, bytes, encoding: 'plain' };
		}
		return {
			ok: false,
			reason:
				'The uploaded file is not a VCF: it is neither gzip-compressed nor does it start with a ##fileformat=VCF header.',
		};
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
