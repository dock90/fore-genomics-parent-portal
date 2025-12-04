import { Storage } from "@google-cloud/storage";
import * as path from "path";
import { PDFDocument } from "pdf-lib";
import { consentPDFService } from "./consent-service";
import { trfPDFService } from "./trf-service";

interface CombinedDocumentData {
  kitId?: string;
  orderNumber?: string;
  kitNumber?: number;
  trfFileName?: string; // Optional since we'll generate TRF as PDF now
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    dateOfBirth?: string;
    gender?: string;
    ethnicity?: string[];
    relationshipToChild?: string;
  };
  childInfo: {
    firstName: string;
    lastName: string;
    dob: string;
    sex: string;
    ethnicities: string[];
  };
  orderInfo?: {
    orderNumber: string;
    kitNumber: number;
    orderDate: string;
  };
  counselorSignature?: string;
  counselorSignatureDate?: string;
  orderingProvider?: {
    name: string;
    address: string;
    addressLine2?: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
    email: string;
    office: string;
    npi?: string;
  };
  consentData?: {
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
    this.trfBucketName =
      process.env.GOOGLE_CLOUD_STORAGE_BUCKET || "fore-genomics-trfs";
  }

  async createCombinedDocument(
    data: CombinedDocumentData
  ): Promise<{ pdfBuffer: Buffer; fileName: string }> {
    try {
      // Step 1: Generate TRF as PDF
      const trfPDFBuffer = await this.generateTRFPDF(data);

      // Step 2: Generate the consent PDF
      const consentPDFBuffer = await this.generateConsentPDF(data);

      // Step 3: Merge both PDFs into a single document
      const combinedPDFBuffer = await this.mergePDFs([
        trfPDFBuffer,
        consentPDFBuffer,
      ]);

      // Generate filename for the combined PDF
      const timestamp = new Date().toISOString().split("T")[0];
      const fileName = `${data.orderNumber}-${data.kitNumber}-${timestamp}-combined.pdf`;

      return { pdfBuffer: combinedPDFBuffer, fileName };
    } catch (error) {
      throw new Error(
        `Failed to create combined PDF document: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async generateTRFPDF(data: CombinedDocumentData): Promise<Buffer> {
    try {
      // Generate TRF PDF using the new TRF PDF service
      const trfData = {
        userInfo: {
          ...data.userInfo,
          addressLine2: data.userInfo.addressLine2 || "",
        },
        childInfo: data.childInfo,
        consentData: {
          relationshipToChild:
            data.consentData?.relationshipToChild ||
            data.userInfo.relationshipToChild ||
            "MOTHER",
        },
        orderNumber: data.orderNumber || data.orderInfo?.orderNumber || "",
        kitNumber: data.kitNumber || data.orderInfo?.kitNumber,
        counselorSignature: data.counselorSignature
          ? {
              image: data.counselorSignature,
              name: "Counselor",
              title: "Genetic Counselor",
              date:
                data.counselorSignatureDate ||
                new Date().toISOString().split("T")[0],
            }
          : undefined,
        orderingProvider: data.orderingProvider,
      };

      const { pdfBuffer } = await trfPDFService.generateTRFPDF(trfData);
      return pdfBuffer;
    } catch (error) {
      throw new Error(
        `Failed to generate TRF PDF: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async generateConsentPDF(
    data: CombinedDocumentData
  ): Promise<Buffer> {
    try {
      // Generate consent PDF on-demand using the consent PDF service
      const consentData = {
        childInfo: data.childInfo,
        consentData: data.consentData || {
          part1Accepted: false,
          part2Accepted: false,
          part3Accepted: false,
          consentAll: false,
          signature: null,
          signatureDate: null,
          signerName: null,
          relationshipToChild: null,
          ipAddress: "",
          userAgent: "",
        },
        orderNumber: data.orderNumber || "",
        kitNumber: data.kitNumber,
      };

      const { pdfBuffer } =
        await consentPDFService.generateConsentPDF(consentData);
      return pdfBuffer;
    } catch (error) {
      throw new Error(
        `Failed to generate consent PDF: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }

  private async mergePDFs(pdfBuffers: Buffer[]): Promise<Buffer> {
    try {
      // Create a new PDF document
      const mergedPdf = await PDFDocument.create();

      // Copy pages from each PDF buffer
      for (const pdfBuffer of pdfBuffers) {
        const pdf = await PDFDocument.load(pdfBuffer);
        const pageIndices = pdf.getPageIndices();
        const pages = await mergedPdf.copyPages(pdf, pageIndices);

        // Add each page to the merged document
        pages.forEach((page) => mergedPdf.addPage(page));
      }

      // Save the merged PDF as a buffer
      const mergedPdfBytes = await mergedPdf.save();
      return Buffer.from(mergedPdfBytes);
    } catch (error) {
      throw new Error(
        `Failed to merge PDFs: ${error instanceof Error ? error.message : String(error)}`
      );
    }
  }
}

// Export singleton instance
export const combinedDocumentService = new CombinedDocumentService();
