import { Storage } from '@google-cloud/storage';
import { prisma } from '@/lib/prisma';

export type ReportType = 'parent' | 'pediatrician' | 'fullLab' | 'legacy';

class ReportStorageService {
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

		const storageOptions = {
			projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
			credentials,
		};

		this.storage = new Storage(storageOptions);

		// Just use GOOGLE_CLOUD_REPORTS_BUCKET directly, don't check test mode
		this.bucketName =
			process.env.GOOGLE_CLOUD_REPORTS_BUCKET || 'fore-genomics-reports-prod';
	}

	private getReportTypeSuffix(reportType: ReportType): string {
		switch (reportType) {
			case 'parent':
				return '-parent-report';
			case 'pediatrician':
				return '-pediatrician-report';
			case 'fullLab':
				return '-full-lab-report';
			case 'legacy':
			default:
				return '-report';
		}
	}

	async uploadReport(
		orderId: string,
		kitId: string,
		file: File,
		uploadedBy: string,
		reportType: ReportType = 'legacy'
	): Promise<{ fileUrl: string; fileName: string }> {
		try {
			// Get order and kit info for standardized naming
			const kit = await prisma.kit.findUnique({
				where: { id: kitId },
				include: { order: true },
			});

			if (!kit) throw new Error('Kit not found');

			const kitNumberSuffix = kit.kitNumber ? `-${kit.kitNumber}` : '';
			const date = new Date().toISOString().split('T')[0];
			const fileExtension = file.name.split('.').pop() || 'pdf';
			const reportTypeSuffix = this.getReportTypeSuffix(reportType);

			// Use same environment-based subdirectory pattern as Google storage
			const isProduction = process.env.NODE_ENV === 'production';
			const fileName = isProduction
				? `${kit.order.orderNumber}${kitNumberSuffix}-${date}${reportTypeSuffix}.${fileExtension}`
				: `test/${kit.order.orderNumber}${kitNumberSuffix}-${date}${reportTypeSuffix}.${fileExtension}`;

			// Convert File to Buffer
			const arrayBuffer = await file.arrayBuffer();
			const buffer = Buffer.from(arrayBuffer);

			const bucket = this.storage.bucket(this.bucketName);
			const fileObj = bucket.file(fileName);

			await fileObj.save(buffer, {
				metadata: {
					contentType: file.type,
					metadata: {
						orderId,
						kitId,
						uploadedBy,
						originalName: file.name,
						uploadedAt: new Date().toISOString(),
						reportType,
					},
				},
			});

			// Generate a signed URL for immediate access
			const [signedUrl] = await fileObj.getSignedUrl({
				version: 'v4',
				action: 'read',
				expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
			});

			return {
				fileUrl: signedUrl,
				fileName,
			};
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to upload report: ${message}`);
		}
	}

	/**
	 * Create a short-lived V4 signed URL the browser can PUT a report file to
	 * directly, bypassing the app server entirely.
	 *
	 * This is required on Vercel: Server Actions (and any serverless function)
	 * have a hard 4.5MB request-body limit that `bodySizeLimit` cannot raise, so
	 * routing a multi-MB report through the action fails before it runs. Uploading
	 * straight to GCS sidesteps that limit.
	 *
	 * The returned `fileName` uses the exact same naming pattern as uploadReport()
	 * so the existing download path (which reads the stored fileName) keeps working.
	 * The bucket must have a CORS policy allowing PUT from the app origin.
	 */
	async createReportUploadUrl(
		orderId: string,
		kitId: string,
		originalFileName: string,
		contentType: string,
		reportType: ReportType = 'legacy'
	): Promise<{ uploadUrl: string; fileName: string; contentType: string }> {
		try {
			const kit = await prisma.kit.findUnique({
				where: { id: kitId },
				include: { order: true },
			});

			if (!kit) throw new Error('Kit not found');

			const kitNumberSuffix = kit.kitNumber ? `-${kit.kitNumber}` : '';
			const date = new Date().toISOString().split('T')[0];
			const fileExtension = originalFileName.split('.').pop() || 'pdf';
			const reportTypeSuffix = this.getReportTypeSuffix(reportType);

			const isProduction = process.env.NODE_ENV === 'production';
			const fileName = isProduction
				? `${kit.order.orderNumber}${kitNumberSuffix}-${date}${reportTypeSuffix}.${fileExtension}`
				: `test/${kit.order.orderNumber}${kitNumberSuffix}-${date}${reportTypeSuffix}.${fileExtension}`;

			// The content type is baked into the signature, so the browser PUT must
			// send the exact same value (we echo it back for that reason).
			const normalizedContentType = contentType || 'application/octet-stream';

			const bucket = this.storage.bucket(this.bucketName);
			const fileObj = bucket.file(fileName);

			const [uploadUrl] = await fileObj.getSignedUrl({
				version: 'v4',
				action: 'write',
				expires: Date.now() + 15 * 60 * 1000, // 15 minutes
				contentType: normalizedContentType,
			});

			return { uploadUrl, fileName, contentType: normalizedContentType };
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unknown error';
			throw new Error(`Failed to create upload URL: ${message}`);
		}
	}

	async getReportUrl(fileName: string): Promise<string> {
		try {
			const bucket = this.storage.bucket(this.bucketName);
			const file = bucket.file(fileName);

			const [signedUrl] = await file.getSignedUrl({
				version: 'v4',
				action: 'read',
				expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
			});

			return signedUrl;
		} catch (error) {
			throw new Error('Failed to generate report URL');
		}
	}

	async getReportsByKitId(kitId: string): Promise<string[]> {
		try {
			// Get kit info to find associated order number
			const kit = await prisma.kit.findUnique({
				where: { id: kitId },
				include: { order: true },
			});

			if (!kit) return [];

			const bucket = this.storage.bucket(this.bucketName);
			const isProduction = process.env.NODE_ENV === 'production';
			const prefix = isProduction ? undefined : 'test/';

			// Get all files and filter for reports related to this kit's order
			const [files] = await bucket.getFiles({ prefix });

			// Filter for report files that match this kit's order
			const kitNumberSuffix = kit.kitNumber ? `-${kit.kitNumber}` : '';
			const orderPrefix = `${kit.order.orderNumber}${kitNumberSuffix}`;

			return files
				.filter(
					(file) =>
						file.name.includes(orderPrefix) && file.name.includes('-report.')
				)
				.map((file) => file.name);
		} catch (error) {
			throw new Error('Failed to get reports for kit');
		}
	}

	async listReports(): Promise<string[]> {
		try {
			const bucket = this.storage.bucket(this.bucketName);
			const isProduction = process.env.NODE_ENV === 'production';
			const prefix = isProduction ? undefined : 'test/';
			const [files] = await bucket.getFiles({ prefix });

			// Filter to only return report files
			return files
				.filter((file) => file.name.includes('-report.'))
				.map((file) => file.name);
		} catch (error) {
			throw error;
		}
	}

	async deleteReport(fileName: string): Promise<void> {
		try {
			const bucket = this.storage.bucket(this.bucketName);
			const file = bucket.file(fileName);

			await file.delete();
		} catch (error) {
			throw new Error('Failed to delete report');
		}
	}
}

// Export singleton instance
export const reportStorageService = new ReportStorageService();
