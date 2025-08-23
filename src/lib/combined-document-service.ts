import { Storage } from "@google-cloud/storage";
import * as path from "path";
import JSZip from "jszip";
import { consentPDFService } from "./consent-pdf-service";

interface CombinedDocumentData {
  kitId: string;
  orderNumber: string;
  kitNumber: number;
  trfFileName: string;
  consentData: {
    childInfo: {
      firstName: string;
      lastName: string;
      dob: string;
      sex: string;
      ethnicities: string[];
    };
    consentData: {
      part1Accepted: boolean;
      part2Accepted: boolean;
      part3Accepted: boolean;
      consentAll: boolean;
      signature: string | null;
      signatureDate: string | null;
      signerName: string | null;
      relationshipToChild: string | null;
      ipAddress?: string;
      userAgent?: string;
    };
    orderNumber: string;
    kitNumber?: number;
  };
}

class CombinedDocumentService {
  private storage: Storage;
  private trfBucketName: string;

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
    this.trfBucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "fore-genomics-trfs";
  }

  async createCombinedDocument(
    data: CombinedDocumentData
  ): Promise<{ zipBuffer: Buffer; fileName: string }> {
    try {
      console.log("Creating combined document archive for kit:", data.kitId);

      // Step 1: Download the TRF Excel file from storage
      const trfBuffer = await this.downloadTRFFile(data.trfFileName);
      
      // Step 2: Generate the consent PDF on-demand
      const consentPDFBuffer = await this.generateConsentPDF(data.consentData);
      
      // Step 3: Create a zip archive containing both files
      const zipBuffer = await this.createZipArchive(trfBuffer, consentPDFBuffer, data);
      
      // Generate filename for the archive
      const timestamp = new Date().toISOString().split("T")[0];
      const fileName = `${data.orderNumber}-${data.kitNumber}-${timestamp}-combined.zip`;
      
      console.log("Combined document archive created successfully:", fileName);
      return { zipBuffer, fileName };
      
    } catch (error) {
      console.error("Error creating combined document archive:", error);
      throw new Error(`Failed to create combined document archive: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async downloadTRFFile(fileName: string): Promise<Buffer> {
    try {
      const bucket = this.storage.bucket(this.trfBucketName);
      const file = bucket.file(fileName);
      
      const [buffer] = await file.download();
      return buffer;
    } catch (error) {
      console.error("Error downloading TRF file:", error);
      throw new Error(`Failed to download TRF file: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async generateConsentPDF(consentData: CombinedDocumentData['consentData']): Promise<Buffer> {
    try {
      // Generate consent PDF on-demand using the consent PDF service
      const { pdfBuffer } = await consentPDFService.generateConsentPDF(consentData);
      return pdfBuffer;
    } catch (error) {
      console.error("Error generating consent PDF:", error);
      throw new Error(`Failed to generate consent PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  private async createZipArchive(
    trfBuffer: Buffer,
    consentPDFBuffer: Buffer,
    data: CombinedDocumentData
  ): Promise<Buffer> {
    try {
      const zip = new JSZip();
      
      // Add TRF Excel file to the zip
      const trfFileName = `TRF-${data.orderNumber}-${data.kitNumber}.xlsx`;
      zip.file(trfFileName, trfBuffer);
      
      // Add consent PDF to the zip
      const consentFileName = `Consent-${data.orderNumber}-${data.kitNumber}.pdf`;
      zip.file(consentFileName, consentPDFBuffer);
      
      // Generate the zip file
      const zipBuffer = await zip.generateAsync({ type: "nodebuffer" });
      
      return zipBuffer;
      
    } catch (error) {
      console.error("Error creating zip archive:", error);
      throw new Error(`Failed to create zip archive: ${error instanceof Error ? error.message : String(error)}`);
    }
  }
}

// Export singleton instance
export const combinedDocumentService = new CombinedDocumentService();
