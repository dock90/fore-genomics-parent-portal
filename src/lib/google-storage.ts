import { Storage } from "@google-cloud/storage";
import * as path from "path";

class GoogleStorageService {
  private storage: Storage;
  private bucketName: string;
  private approvedBucketName: string;

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
    this.bucketName =
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "fore-genomics-trfs";
    this.approvedBucketName =
      process.env.GOOGLE_CLOUD_APPROVED_TRF_BUCKET ||
      "fore-genomics-approved-trfs";
  }

  async getOnboardingRecord(
    fileName: string
  ): Promise<{ fileUrl: string; fileName: string } | null> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }

      // Generate a signed URL
      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        fileUrl: signedUrl,
        fileName: fileName,
      };
    } catch (error) {
      return null;
    }
  }

  async listOnboardingRecords(): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const isProduction = process.env.NODE_ENV === "production";
      const prefix = isProduction ? undefined : "test/";
      const [files] = await bucket.getFiles({ prefix });

      // Filter to only return Excel files (onboarding records)
      return files
        .filter((file) => file.name.endsWith(".xlsx"))
        .map((file) => file.name);
    } catch (error) {
      throw error;
    }
  }

  async deleteOnboardingRecord(fileName: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);

      await file.delete();
    } catch (error) {
      throw error;
    }
  }

  // Approved TRF Methods

  /**
   * Upload an approved TRF file to the approved TRF bucket
   */
  async uploadApprovedTRF(
    orderNumber: string,
    kitNumber: number,
    file: File,
    uploadedBy: string
  ): Promise<{ fileUrl: string; fileName: string }> {
    try {
      // Validate file size (25 MB limit)
      const maxSize = 25 * 1024 * 1024; // 25 MB in bytes
      if (file.size > maxSize) {
        throw new Error(
          `File size exceeds 25 MB limit. File: ${file.name}, Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`
        );
      }

      const kitNumberSuffix = kitNumber ? `-${kitNumber}` : "";
      const date = new Date().toISOString().split("T")[0];
      const fileExtension = file.name.split(".").pop() || "xlsx";

      // Use same environment-based subdirectory pattern as other storage
      const isProduction = process.env.NODE_ENV === "production";
      const fileName = isProduction
        ? `${orderNumber}${kitNumberSuffix}-${date}-approved-trf.${fileExtension}`
        : `test/${orderNumber}${kitNumberSuffix}-${date}-approved-trf.${fileExtension}`;

      // Convert File to Buffer
      const arrayBuffer = await file.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const bucket = this.storage.bucket(this.approvedBucketName);
      const fileObj = bucket.file(fileName);

      await fileObj.save(buffer, {
        metadata: {
          contentType: file.type,
          metadata: {
            orderNumber,
            kitNumber,
            uploadedBy,
            originalName: file.name,
            uploadedAt: new Date().toISOString(),
            type: "approved-trf",
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
      throw new Error("Failed to upload approved TRF");
    }
  }

  /**
   * Get an approved TRF file from the approved TRF bucket
   */
  async getApprovedTRF(
    fileName: string
  ): Promise<{ fileUrl: string; fileName: string } | null> {
    try {
      const bucket = this.storage.bucket(this.approvedBucketName);
      const file = bucket.file(fileName);

      // Check if file exists
      const [exists] = await file.exists();
      if (!exists) {
        return null;
      }

      // Generate a signed URL
      const [signedUrl] = await file.getSignedUrl({
        version: "v4",
        action: "read",
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      return {
        fileUrl: signedUrl,
        fileName,
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Delete an approved TRF file from the approved TRF bucket
   */
  async deleteApprovedTRF(fileName: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.approvedBucketName);
      const file = bucket.file(fileName);

      await file.delete();
    } catch (error) {
      throw error;
    }
  }

  /**
   * List all approved TRF files in the approved TRF bucket
   */
  async listApprovedTRFs(): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.approvedBucketName);
      const isProduction = process.env.NODE_ENV === "production";
      const prefix = isProduction ? undefined : "test/";
      const [files] = await bucket.getFiles({ prefix });

      // Filter to only return approved TRF files
      return files
        .filter((file) => file.name.includes("-approved-trf."))
        .map((file) => file.name);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Upload TRF PDF to Google Cloud Storage
   */
  async uploadTRFPDF(
    pdfBuffer: Buffer,
    fileName: string
  ): Promise<{ fileUrl: string; fileName: string }> {
    try {
      const bucket = this.storage.bucket(this.bucketName);

      // Determine storage path based on environment
      const isProduction = process.env.NODE_ENV === "production";
      const storagePath = isProduction ? fileName : `test/${fileName}`;

      const file = bucket.file(storagePath);

      // Upload the PDF buffer
      await file.save(pdfBuffer, {
        metadata: {
          contentType: "application/pdf",
        },
      });

      // Generate signed URL for download
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });

      return {
        fileUrl: signedUrl,
        fileName: storagePath,
      };
    } catch (error) {
      throw new Error(
        `Failed to upload TRF PDF: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  /**
   * Upload approved TRF PDF to the dedicated approved TRF bucket
   */
  async uploadApprovedTRFPDF(
    pdfBuffer: Buffer,
    fileName: string
  ): Promise<{ fileUrl: string; fileName: string }> {
    try {
      const bucket = this.storage.bucket(this.approvedBucketName);

      // Determine storage path based on environment
      const isProduction = process.env.NODE_ENV === "production";
      const storagePath = isProduction ? fileName : `test/${fileName}`;

      const file = bucket.file(storagePath);

      // Upload the PDF buffer
      await file.save(pdfBuffer, {
        metadata: {
          contentType: "application/pdf",
        },
      });

      // Generate signed URL for download
      const [signedUrl] = await file.getSignedUrl({
        action: "read",
        expires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      });

      return {
        fileUrl: signedUrl,
        fileName: storagePath,
      };
    } catch (error) {
      throw new Error(
        `Failed to upload approved TRF PDF: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Export singleton instance
export const googleStorageService = new GoogleStorageService();
