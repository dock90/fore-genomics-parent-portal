import { Storage } from "@google-cloud/storage";
import * as path from "path";

class ReportStorageService {
  private storage: Storage;
  private bucketName: string;

  constructor() {
    // Use keyfile for local development, environment variables for production
    const storageOptions: any = {
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    };

    if (process.env.NODE_ENV === "production") {
      // Use environment variables for production
      const credentials = {
        type: "service_account",
        project_id: process.env.GOOGLE_CLOUD_PROJECT_ID,
        private_key_id: process.env.GOOGLE_CLOUD_PRIVATE_KEY_ID,
        private_key: process.env.GOOGLE_CLOUD_PRIVATE_KEY?.replace(
          /\\n/g,
          "\n"
        ),
        client_email: process.env.GOOGLE_CLOUD_CLIENT_EMAIL,
        client_id: process.env.GOOGLE_CLOUD_CLIENT_ID,
        auth_uri: "https://accounts.google.com/o/oauth2/auth",
        token_uri: "https://oauth2.googleapis.com/token",
        auth_provider_x509_cert_url:
          "https://www.googleapis.com/oauth2/v1/certs",
        client_x509_cert_url: process.env.GOOGLE_CLOUD_CLIENT_X509_CERT_URL,
      };

      storageOptions.credentials = credentials;
    } else {
      // Use keyfile for local development
      storageOptions.keyFilename = path.join(
        process.cwd(),
        "service-account-key.json"
      );
    }

    this.storage = new Storage(storageOptions);

    // Use different buckets for test mode vs production
    const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";
    if (isTestMode) {
      // Local development and staging use the same test bucket
      this.bucketName =
        process.env.GOOGLE_CLOUD_REPORTS_BUCKET || "fore-genomics-reports-test";
    } else {
      // Production uses separate bucket
      this.bucketName =
        process.env.GOOGLE_CLOUD_REPORTS_BUCKET || "fore-genomics-reports-prod";
    }
  }

  async uploadReport(
    orderId: string,
    kitId: string,
    file: File,
    uploadedBy: string
  ): Promise<{ fileUrl: string; fileName: string }> {
    try {
      const fileName = `${kitId}/${Date.now()}-${file.name}`;

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
          },
        },
      });

      // Generate a signed URL for immediate access
      const [signedUrl] = await fileObj.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        fileUrl: signedUrl,
        fileName,
      };
    } catch (error) {
      console.error("Failed to upload report to Google Cloud Storage:", error);
      throw new Error("Failed to upload report");
    }
  }

  async getReportUrl(fileName: string): Promise<string> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return signedUrl;
    } catch (error) {
      console.error("Failed to generate report URL:", error);
      throw new Error("Failed to generate report URL");
    }
  }

  async getReportsByKitId(kitId: string): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const [files] = await bucket.getFiles({
        prefix: `${kitId}/`,
      });

      return files.map((file) => file.name);
    } catch (error) {
      console.error("Failed to get reports for kit:", error);
      throw new Error("Failed to get reports for kit");
    }
  }

  async deleteReport(fileName: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      await file.delete();
    } catch (error) {
      console.error("Failed to delete report:", error);
      throw new Error("Failed to delete report");
    }
  }
}

// Export singleton instance
export const reportStorageService = new ReportStorageService();
