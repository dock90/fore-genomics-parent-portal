import puppeteer from "puppeteer";

// Alternative PDF generation for serverless environments
let puppeteerAvailable = true;
try {
  require.resolve('puppeteer');
} catch {
  puppeteerAvailable = false;
  console.warn('Puppeteer not available, will use alternative PDF generation method');
}

interface TRFData {
  userInfo: {
    firstName: string;
    lastName: string;
    email: string;
    address: string;
    addressLine2: string;
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
    ethnicities: string[];
  };
  consentData: {
    relationshipToChild: string;
  };
  orderNumber: string;
  kitNumber?: number;
  counselorSignature?: {
    image: string;
    name: string;
    title: string;
    date: string;
  };
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
}

class TRFPDFService {
  /**
   * Generate TRF PDF on-demand
   * Returns the PDF buffer directly without storing it
   */
  async generateTRFPDF(
    data: TRFData
  ): Promise<{ pdfBuffer: Buffer; fileName: string }> {
    try {
      console.log('Generating TRF PDF on-demand');

      // Generate HTML content for the PDF
      const htmlContent = this.generateTRFHTMLInternal(data);

      let pdfBuffer: Buffer;

      // Check if we're in a serverless environment
      const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';

      if (isServerless) {
        try {
          // Use browserless.io REST API for serverless environments
          console.log('Using browserless.io REST API for TRF PDF generation in serverless environment');

          const response = await fetch(`https://production-sfo.browserless.io/pdf?token=${process.env.BROWSERLESS_TOKEN}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            },
            body: JSON.stringify({
              html: htmlContent,
              options: {
                format: 'A4',
                margin: {
                  top: '0.5in',
                  right: '0.5in',
                  bottom: '0.8in',
                  left: '0.5in',
                },
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: '<div></div>',
                footerTemplate: `
                  <div style="font-size: 10px; color: #666; text-align: center; width: 100%;">
                    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                  </div>
                `,
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Browserless API error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const pdfArrayBuffer = await response.arrayBuffer();
          pdfBuffer = Buffer.from(pdfArrayBuffer);

        } catch (browserlessError) {
          console.warn('Browserless.io failed, falling back to alternative method:', browserlessError);
          pdfBuffer = await this.generatePDFFallback(htmlContent);
        }
      } else if (puppeteerAvailable) {
        try {
          // Launch Puppeteer with proper configuration for local development
          const browser = await puppeteer.launch({
            headless: true,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
              "--no-first-run",
              "--no-zygote",
              "--single-process",
              "--disable-extensions"
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          });

          const page = await browser.newPage();

          // Set content and wait for it to load
          await page.setContent(htmlContent, { waitUntil: "networkidle0" });

          // Generate PDF
          const pdfUint8Array = await page.pdf({
            format: "A4",
            margin: {
              top: "0.5in",
              right: "0.5in",
              bottom: "0.8in",
              left: "0.5in",
            },
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: '<div></div>',
            footerTemplate: `
              <div style="font-size: 10px; color: #666; text-align: center; width: 100%;">
                Page <span class="pageNumber"></span> of <span class="totalPages"></span>
              </div>
            `,
          });

          pdfBuffer = Buffer.from(pdfUint8Array);

          await browser.close();
        } catch (puppeteerError) {
          console.warn('Local Puppeteer failed, falling back to alternative method:', puppeteerError);
          pdfBuffer = await this.generatePDFFallback(htmlContent);
        }
      } else {
        // Use alternative method directly for environments without Puppeteer
        console.log('Using fallback PDF generation method');
        pdfBuffer = await this.generatePDFFallback(htmlContent);
      }

      // Generate filename for reference
      const kitNumberSuffix = data.kitNumber ? `-${data.kitNumber}` : "";
      const fileName = `${data.orderNumber}${kitNumberSuffix}-${new Date().toISOString().split('T')[0]}-trf.pdf`;

      console.log('TRF PDF generated successfully');
      return { pdfBuffer, fileName };
    } catch (error) {
      console.error('Failed to generate TRF PDF:', error);
      throw new Error(`Failed to generate TRF PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate HTML content for TRF (public method for viewing)
   */
  generateTRFHTML(data: TRFData): string {
    return this.generateTRFHTMLInternal(data);
  }

  /**
   * Generate signed TRF PDF with counselor signature
   */
  async generateSignedTRFPDF(data: TRFData): Promise<{ pdfBuffer: Buffer; fileName: string }> {
    try {
      console.log('Generating signed TRF PDF');

      // Generate HTML content for the PDF with signature
      const htmlContent = this.generateTRFHTMLInternal(data);

      let pdfBuffer: Buffer;

      // Check if we're in a serverless environment
      const isServerless = process.env.VERCEL || process.env.NODE_ENV === 'production';

      if (isServerless) {
        try {
          // Use browserless.io REST API for serverless environments
          console.log('Using browserless.io REST API for signed TRF PDF generation in serverless environment');

          const response = await fetch(`https://production-sfo.browserless.io/pdf?token=${process.env.BROWSERLESS_TOKEN}`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Cache-Control': 'no-cache',
            },
            body: JSON.stringify({
              html: htmlContent,
              options: {
                format: 'A4',
                margin: {
                  top: '0.5in',
                  right: '0.5in',
                  bottom: '0.8in',
                  left: '0.5in',
                },
                printBackground: true,
                displayHeaderFooter: true,
                headerTemplate: '<div></div>',
                footerTemplate: `
                  <div style="font-size: 10px; color: #666; text-align: center; width: 100%;">
                    Page <span class="pageNumber"></span> of <span class="totalPages"></span>
                  </div>
                `,
              },
            }),
          });

          if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Browserless API error: ${response.status} ${response.statusText} - ${errorText}`);
          }

          const pdfArrayBuffer = await response.arrayBuffer();
          pdfBuffer = Buffer.from(pdfArrayBuffer);

        } catch (browserlessError) {
          console.warn('Browserless.io failed, falling back to alternative method:', browserlessError);
          pdfBuffer = await this.generatePDFFallback(htmlContent);
        }
      } else if (puppeteerAvailable) {
        try {
          // Launch Puppeteer with proper configuration for local development
          const browser = await puppeteer.launch({
            headless: true,
            args: [
              "--no-sandbox",
              "--disable-setuid-sandbox",
              "--disable-dev-shm-usage",
              "--disable-gpu",
              "--no-first-run",
              "--no-zygote",
              "--single-process",
              "--disable-extensions"
            ],
            executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
          });

          const page = await browser.newPage();

          // Set content and wait for it to load
          await page.setContent(htmlContent, { waitUntil: "networkidle0" });

          // Generate PDF with page numbers
          const pdfUint8Array = await page.pdf({
            format: "A4",
            margin: {
              top: "0.5in",
              right: "0.5in",
              bottom: "0.8in",
              left: "0.5in",
            },
            printBackground: true,
            displayHeaderFooter: true,
            headerTemplate: '<div></div>',
            footerTemplate: `
              <div style="font-size: 10px; color: #666; text-align: center; width: 100%;">
                Page <span class="pageNumber"></span> of <span class="totalPages"></span>
              </div>
            `,
          });

          pdfBuffer = Buffer.from(pdfUint8Array);

          await browser.close();
        } catch (puppeteerError) {
          console.warn('Local Puppeteer failed, falling back to alternative method:', puppeteerError);
          pdfBuffer = await this.generatePDFFallback(htmlContent);
        }
      } else {
        // Use alternative method directly for environments without Puppeteer
        console.log('Using fallback PDF generation method');
        pdfBuffer = await this.generatePDFFallback(htmlContent);
      }

      // Generate filename for reference
      const kitNumberSuffix = data.kitNumber ? `-${data.kitNumber}` : "";
      const fileName = `signed-${data.orderNumber}${kitNumberSuffix}-${new Date().toISOString().split('T')[0]}-trf.pdf`;

      console.log('Signed TRF PDF generated successfully');
      return { pdfBuffer, fileName };
    } catch (error) {
      console.error('Failed to generate signed TRF PDF:', error);
      throw new Error(`Failed to generate signed TRF PDF: ${error instanceof Error ? error.message : String(error)}`);
    }
  }

  /**
   * Generate HTML content for TRF PDF (internal method)
   */
  private generateTRFHTMLInternal(data: TRFData): string {
    return `
      <!DOCTYPE html>
      <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Test Requisition Form (TRF)</title>
          <style>
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            
            body {
              font-family: Arial, sans-serif;
              font-size: 12px;
              line-height: 1.4;
              color: #333;
              margin: 0;
              padding: 20px;
              padding-bottom: 40px;
            }
            
            .header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            
            .header h1 {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 5px;
            }
            
            .header .order-info {
              font-size: 14px;
              font-weight: bold;
            }
            
            .section {
              margin-bottom: 16px;
              page-break-inside: avoid;
            }
            
            .section-title {
              font-size: 14px;
              font-weight: bold;
              margin-bottom: 15px;
              padding: 8px;
              background-color: #f5f5f5;
              border-left: 4px solid #333;
            }
            
            .field-grid {
              display: grid;
              grid-template-columns: 1fr;
              gap: 15px;
              margin-bottom: 15px;
            }
            
            .field {
              margin-bottom: 8px;
            }
            
            .field-label {
              font-weight: bold;
              display: inline-block;
              min-width: 120px;
              margin-right: 10px;
            }
            
            .field-value {
              display: inline-block;
              border-bottom: 1px solid #333;
              min-width: 200px;
              padding-bottom: 2px;
            }
            
            .underline {
              text-decoration: underline;
              border-bottom: none;
            }

            .indent {
              text-indent: -80px;
              padding-left: 128px;
            }

            .flex {
              display: flex;
            }
            
            .full-width-field {
              margin-bottom: 8px;
            }
            
            .full-width-field .field-label {
              display: block;
              margin-bottom: 5px;
            }
            
            .full-width-field .field-value {
              display: block;
              width: 100%;
              border-bottom: 1px solid #333;
              padding-bottom: 2px;
            }
            
            .signature-section {
              margin-top: 0px;
              padding-top: 16px;
            }
            
            .signature-line {
              border-bottom: 1px solid #333;
              width: 300px;
              margin-bottom: 5px;
            }
            
            .signature-label {
              font-size: 10px;
              color: #666;
            }
            
            @media print {
              body {
                margin: 0;
                padding: 15px;
                padding-bottom: 40px;
              }
              
              .section {
                page-break-inside: avoid;
              }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fore Genomics Test Requisition Form (TRF)</h1>
          </div>
            
          <div class="section">
            <div class="field-grid">
              <div class="field">
                <span class="field-label">Identifier:</span>
                <span class="field-value">${data.orderNumber}-${data.kitNumber}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Child Information</div>
            <div class="field-grid">
              <div class="field">
                <span class="field-label">Name:</span>
                <span class="field-value">${data.childInfo.firstName} ${data.childInfo.lastName}</span>
              </div>
              <div class="field">
                <span class="field-label">Date of Birth:</span>
                <span class="field-value">${data.childInfo.dob}</span>
              </div>
              <div class="field">
                <span class="field-label">Sex:</span>
                <span class="field-value">${data.childInfo.sex}</span>
              </div>
              <div class="field">
                <span class="field-label">Ethnicity:</span>
                <span class="field-value">${data.childInfo.ethnicities.join(', ')}</span>
              </div>
            </div>
          </div>
          
          <div class="section">
            <div class="section-title">Parent/Legal Guardian Information</div>
            <div class="field-grid">
              <div class="field">
                <span class="field-label">Relationship:</span>
                <span class="field-value">${data.consentData.relationshipToChild}</span>
              </div>
              <div class="field">
                <span class="field-label">Name:</span>
                <span class="field-value">${data.userInfo.firstName} ${data.userInfo.lastName}</span>
              </div>
              <div class="field">
                <span class="field-label">Address:</span>
                <span class="field-value">${data.userInfo.address}</span>
              </div>
              <div class="field">
                <span class="field-label">Address Line 2:</span>
                <span class="field-value">${data.userInfo.addressLine2}</span>
              </div>
              <div class="field">
                <span class="field-label">City:</span>
                <span class="field-value">${data.userInfo.city}</span>
              </div>
              <div class="field">
                <span class="field-label">State:</span>
                <span class="field-value">${data.userInfo.state}</span>
              </div>
              <div class="field">
                <span class="field-label">Zip Code:</span>
                <span class="field-value">${data.userInfo.zipCode}</span>
              </div>
              <div class="field">
                <span class="field-label">Phone:</span>
                <span class="field-value">${data.userInfo.phone}</span>
              </div>
              <div class="field">
                <span class="field-label">Email:</span>
                <span class="field-value">${data.userInfo.email}</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Ordering Provider</div>
            <div class="field-grid">
                <div class="field">
                    <span class="field-label">Name:</span>
                    <span class="field-value">${data.orderingProvider?.name || ''}</span>
                </div>
                <div class="field">
                    <span class="field-label">Address:</span>
                    <span class="field-value">${data.orderingProvider?.address || ''}</span>
                </div>
                <div class="field">
                    <span class="field-label">Address Line 2:</span>
                    <span class="field-value">${data.orderingProvider?.addressLine2 || ''}</span>
                </div>
                <div class="field">
                    <span class="field-label">City:</span>
                    <span class="field-value">${data.orderingProvider?.city || ''}</span>
                </div>
                <div class="field">
                    <span class="field-label">State:</span>
                    <span class="field-value">${data.orderingProvider?.state || ''}</span>
                </div>
                <div class="field">
                    <span class="field-label">Zip Code:</span>
                    <span class="field-value">${data.orderingProvider?.zipCode || ''}</span>
                </div>
                <div class="field">
                    <span class="field-label">Phone:</span>
                    <span class="field-value">${data.orderingProvider?.phone || ''}</span>
                </div>
                <div class="field">
                    <span class="field-label">Email:</span>
                    <span class="field-value">${data.orderingProvider?.email || ''}</span>
                </div>
                <div class="field">
                    <span class="field-label">Office/Practice/Institution:</span>
                    <span class="field-value">${data.orderingProvider?.office || ''}</span>
                </div>
                <div class="field">
                    <span class="field-label">NPI:</span>
                    <span class="field-value">${data.orderingProvider?.npi || ''}</span>
                </div>
            </div>
          </div>

          <div class="section">
            <div class="field-grid">
              <div class="field">
                <span class="field-label"><b>Send an Additional Copy of Results to:</b></span>
                <span class="field-value">Fore Genomics, Inc. - reports@foregenomics.com</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="field-grid">
              <div class="field">
                <span class="field-label"><b>Billing Instructions:</b></span>
                <span class="field-value">Bill to Fore Genomics Institutional Account</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Ordering Instructions:</div>
            <div class="field-grid">
              <div class="field">
                <span class="field-label">Sample Type:</span>
                <span class="field-value">Buccal swab in fixative solution</span>
              </div>
              <div class="flex">
                <span class="field-label">Test Ordered:</span>
                <span class="field-value underline">Fore Genomics Pediatric Genetic Health Screen performed by Inocras Inc. at its laboratory at 6330 Nancy Ridge Drive Suite 106, San Diego, CA 92121 (CLIA # 05D2280195)</span>
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Physician Confirmation of Informed Consent and Medical Necessity</div>
            <div class="full-width-field">
              <span class="">I certify that an informed consent has been signed by the patient and is on file with the ordering healthcare professional. I confirm that testing is medically necessary and that test results may impact medical management for the patient.</span>
            </div>
          </div>
          
          <div class="signature-section">
            ${data.counselorSignature ? `
                <div style="border-bottom: 1px solid #333; width: 300px; margin-bottom: 5px; height: 40px; display: flex; align-items: center;">
                  <img src="${data.counselorSignature.image}" alt="Signature" style="max-height: 30px; max-width: 250px;" />
                </div>
                <div class="signature-label">Signature</div>
              </div>
              
              
              <div style="margin-top: 18px;">
                <div style="border-bottom: 1px solid #333; width: 300px; margin-bottom: 5px; height: 20px;">${data.counselorSignature.date}</div>
                <div class="signature-label">Date</div>
              </div>
            ` : `
              <div class="signature-line"></div>
              <div class="signature-label">Signature</div>
              
              <div style="margin-top: 18px;">
                <div class="signature-line"></div>
                <div class="signature-label">Date</div>
              </div>
            `}
            
            <div style="margin-top: 0px; text-align: left; font-size: 9px; color: #666;">
              FRM 78 Rev3.0
            </div>
          </div>
        </body>
      </html>
    `;
  }

  /**
   * Fallback PDF generation method
   * This is a simple implementation that creates a basic PDF structure
   */
  private async generatePDFFallback(htmlContent: string): Promise<Buffer> {
    // For now, we'll throw an error if fallback is needed
    // In a real implementation, you might use a different PDF library
    throw new Error('PDF generation fallback not implemented. Please ensure Puppeteer or browserless.io is available.');
  }
}

// Export singleton instance
export const trfPDFService = new TRFPDFService();
