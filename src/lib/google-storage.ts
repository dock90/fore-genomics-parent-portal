import { Storage } from '@google-cloud/storage';
import * as ExcelJS from 'exceljs';
import * as fs from 'fs';
import * as path from 'path';

interface OnboardingData {
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    phone: string;
  };
  childInfo: {
    firstName: string;
    lastName: string;
    dob: string;
    sex: string;
    ethnicity: string;
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
    childName: string | null;
    childDOB: string | null;
  };
  questionnaire: {
    question1: boolean;
    question1Details: string | null;
    question2: boolean;
    question2Details: string | null;
    question3: boolean;
    question3Details: string | null;
  };
  orderNumber: string;
  ipAddress: string;
  userAgent: string;
}

class GoogleStorageService {
  private storage: Storage;
  private bucketName: string;
  private templatePath: string;

  constructor() {
    // Use environment variables for service account credentials
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
      credentials,
      projectId: process.env.GOOGLE_CLOUD_PROJECT_ID,
    });
    this.bucketName = process.env.GOOGLE_CLOUD_STORAGE_BUCKET || 'fore-genomics-onboarding';
    // Use public directory for Vercel compatibility
    this.templatePath = path.join(process.cwd(), 'public', 'onboarding-template.xlsx');
    
    console.log('Storage bucket name:', this.bucketName);
    console.log('Project ID:', process.env.GOOGLE_CLOUD_PROJECT_ID);
    console.log('Template path:', this.templatePath);
  }

  private ensureTemplateExists(): void {
    if (!fs.existsSync(this.templatePath)) {
      throw new Error(`Template file not found at ${this.templatePath}. Please ensure onboarding-template.xlsx is saved in the templates/ directory.`);
    }
    
    // Check if file is readable
    try {
      fs.accessSync(this.templatePath, fs.constants.R_OK);
    } catch (error) {
      throw new Error(`Template file exists but is not readable: ${this.templatePath}`);
    }
  }

  async createOnboardingRecord(data: OnboardingData): Promise<{ fileUrl: string; fileName: string }> {
    try {
      // Ensure template exists
      this.ensureTemplateExists();

      // Import the sheet mapper
      const { SheetMapper } = await import('./sheet-mapper');
      
      // Get mappings for the data
      const mappings = SheetMapper.mapOnboardingData(data);
      
              // Load the template using ExcelJS
        const workbook = new ExcelJS.Workbook();
        await workbook.xlsx.readFile(this.templatePath);
      
      // Get the first worksheet
      const worksheet = workbook.worksheets[0];
      if (!worksheet) {
        throw new Error('No worksheet found in template');
      }
      
      // Populate the worksheet with data
      mappings.forEach((mapping: any) => {
        const { row, column, value } = mapping;
        const cell = worksheet.getCell(row + 1, column + 1); // ExcelJS uses 1-based indexing
        cell.value = value;
        
        // Explicitly set font formatting to Arial
        cell.font = {
          name: 'Arial',
          size: 11,
          family: 2 // Arial font family
        };
      });
      
      // Generate Excel buffer
      const excelBuffer = await workbook.xlsx.writeBuffer();

      // Upload Excel file to Cloud Storage
      const isProduction = process.env.NODE_ENV === 'production';
      const storageFileName = isProduction 
        ? `${data.orderNumber}-${new Date().toISOString().split('T')[0]}.xlsx`
        : `test/${data.orderNumber}-${new Date().toISOString().split('T')[0]}.xlsx`;
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(storageFileName);
      
      await file.save(Buffer.from(excelBuffer), {
        metadata: {
          contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        },
      });

      // Generate a signed URL
      const [signedUrl] = await file.getSignedUrl({
        version: 'v4',
        action: 'read',
        expires: Date.now() + 7 * 24 * 60 * 60 * 1000, // 7 days
      });

      console.log('Excel file uploaded successfully:', signedUrl);
      
      return {
        fileUrl: signedUrl,
        fileName: storageFileName,
      };
    } catch (error) {
      console.error('Failed to create and upload Excel file:', error);
      throw error;
    }
  }

  async listOnboardingRecords(): Promise<string[]> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const isProduction = process.env.NODE_ENV === 'production';
      const prefix = isProduction ? undefined : 'test/';
      const [files] = await bucket.getFiles({ prefix });
      
      // Filter to only return Excel files (onboarding records)
      return files
        .filter(file => file.name.endsWith('.xlsx'))
        .map(file => file.name);
    } catch (error) {
      console.error('Failed to list onboarding records:', error);
      throw error;
    }
  }

  async deleteOnboardingRecord(fileName: string): Promise<void> {
    try {
      const bucket = this.storage.bucket(this.bucketName);
      const file = bucket.file(fileName);
      
      await file.delete();
      console.log('File deleted successfully:', fileName);
    } catch (error) {
      console.error('Failed to delete file:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const googleStorageService = new GoogleStorageService(); 