interface ConsentData {
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
}

interface ConsentPDFData {
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
    ethnicities: string[];
  };
  consentData: ConsentData;
  orderNumber: string;
  kitNumber?: number;
}

class BrowserlessPDFService {
  private browserlessToken: string;
  private browserlessUrl: string;

  constructor() {
    this.browserlessToken = process.env.BROWSERLESS_TOKEN || "";
    this.browserlessUrl = "https://production-sfo.browserless.io";

    if (!this.browserlessToken) {
      console.warn(
        "BROWSERLESS_TOKEN not set. PDF generation may fail in production."
      );
    }
  }

  /**
   * Generate consent PDF using browserless.io REST API
   */
  async generateConsentPDF(
    data: ConsentPDFData
  ): Promise<{ pdfBuffer: Buffer; fileName: string }> {
    try {
      // Generate HTML content for the PDF
      const htmlContent = this.generateConsentHTML(data);

      // Use the REST API endpoint
      const response = await fetch(
        `${this.browserlessUrl}/pdf?token=${this.browserlessToken}`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
          },
          body: JSON.stringify({
            html: htmlContent,
            options: {
              format: "A4",
              margin: {
                top: "0.5in",
                right: "0.5in",
                bottom: "0.5in",
                left: "0.5in",
              },
              printBackground: true,
              displayHeaderFooter: false,
            },
          }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(
          `Browserless API error: ${response.status} ${response.statusText} - ${errorText}`
        );
      }

      // Get the PDF buffer
      const pdfArrayBuffer = await response.arrayBuffer();
      const pdfBuffer = Buffer.from(pdfArrayBuffer);

      // Generate filename for reference
      const kitNumberSuffix = data.kitNumber ? `-${data.kitNumber}` : "";
      const fileName = `${data.orderNumber}${kitNumberSuffix}-${new Date().toISOString().split("T")[0]}-consent.pdf`;

      return {
        pdfBuffer,
        fileName,
      };
    } catch (error) {
      // Extract more detailed error information
      let errorMessage = "Unknown error occurred";
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (typeof error === "string") {
        errorMessage = error;
      } else if (error && typeof error === "object") {
        errorMessage = JSON.stringify(error);
      }

      throw new Error(`Failed to generate consent PDF: ${errorMessage}`);
    }
  }

  /**
   * Generate the HTML content for the consent PDF
   */
  private generateConsentHTML(data: ConsentPDFData): string {
    const signatureImage = data.consentData.signature
      ? `<img src="${data.consentData.signature}" alt="Signature" style="max-width: 200px; max-height: 100px;" />`
      : "";

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8">
          <title>Consent Form - ${data.orderNumber}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              line-height: 1.6;
              margin: 0;
              padding: 20px;
              color: #333;
            }
            .header {
              text-align: center;
              border-bottom: 2px solid #333;
              padding-bottom: 20px;
              margin-bottom: 30px;
            }
            .section {
              margin-bottom: 25px;
            }
            .section-title {
              font-size: 18px;
              font-weight: bold;
              margin-bottom: 15px;
              color: #2c3e50;
            }
            .info-grid {
              display: grid;
              grid-template-columns: 1fr 1fr;
              gap: 15px;
              margin-bottom: 20px;
            }
            .info-item {
              margin-bottom: 10px;
            }
            .info-label {
              font-weight: bold;
              color: #555;
            }
            .consent-section {
              border: 1px solid #ddd;
              padding: 15px;
              margin-bottom: 15px;
              border-radius: 5px;
            }
            .consent-item {
              margin-bottom: 10px;
              padding: 8px;
              background-color: #f8f9fa;
              border-radius: 3px;
            }
            .signature-section {
              margin-top: 30px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .signature-box {
              border: 1px solid #ccc;
              padding: 20px;
              margin-top: 15px;
              text-align: center;
              min-height: 100px;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 12px;
              color: #666;
            }
            @media print {
              body { margin: 0; }
              .header { page-break-after: avoid; }
            }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>Fore Genomics - Consent Form</h1>
            <p>Order Number: ${data.orderNumber}</p>
            ${data.kitNumber ? `<p>Kit Number: ${data.kitNumber}</p>` : ""}
            <p>Date: ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="section">
            <div class="section-title">Participant Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name:</span> ${data.userInfo.firstName} ${data.userInfo.lastName}
              </div>
              <div class="info-item">
                <span class="info-label">Email:</span> ${data.userInfo.email}
              </div>
              <div class="info-item">
                <span class="info-label">Phone:</span> ${data.userInfo.phone}
              </div>
              <div class="info-item">
                <span class="info-label">Address:</span> ${data.userInfo.address}
              </div>
              <div class="info-item">
                <span class="info-label">City:</span> ${data.userInfo.city}
              </div>
              <div class="info-item">
                <span class="info-label">State:</span> ${data.userInfo.state}
              </div>
              <div class="info-item">
                <span class="info-label">ZIP Code:</span> ${data.userInfo.zipCode}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Child Information</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Name:</span> ${data.childInfo.firstName} ${data.childInfo.lastName}
              </div>
              <div class="info-item">
                <span class="info-label">Date of Birth:</span> ${data.childInfo.dob}
              </div>
              <div class="info-item">
                <span class="info-label">Sex:</span> ${data.childInfo.sex}
              </div>
              <div class="info-item">
                <span class="info-label">Ethnicities:</span> ${data.childInfo.ethnicities.join(", ")}
              </div>
            </div>
          </div>

          <div class="section">
            <div class="section-title">Consent Details</div>
            <div class="consent-section">
              <div class="consent-item">
                <strong>Part 1 - Research Consent:</strong>
                ${data.consentData.part1Accepted ? "✓ Accepted" : "✗ Not Accepted"}
              </div>
              <div class="consent-item">
                <strong>Part 2 - Sample Collection:</strong>
                ${data.consentData.part2Accepted ? "✓ Accepted" : "✗ Not Accepted"}
              </div>
              <div class="consent-item">
                <strong>Part 3 - Data Usage:</strong>
                ${data.consentData.part3Accepted ? "✓ Accepted" : "✗ Not Accepted"}
              </div>
              <div class="consent-item">
                <strong>Overall Consent:</strong>
                ${data.consentData.consentAll ? "✓ All Parts Accepted" : "✗ Not All Parts Accepted"}
              </div>
            </div>
          </div>

          <div class="signature-section">
            <div class="section-title">Digital Signature</div>
            <div class="info-grid">
              <div class="info-item">
                <span class="info-label">Signer Name:</span> ${data.consentData.signerName || "Not provided"}
              </div>
              <div class="info-item">
                <span class="info-label">Relationship to Child:</span> ${data.consentData.relationshipToChild || "Not provided"}
              </div>
              <div class="info-item">
                <span class="info-label">Signature Date:</span> ${data.consentData.signatureDate || "Not provided"}
              </div>
              <div class="info-item">
                <span class="info-label">IP Address:</span> ${data.consentData.ipAddress || "Not provided"}
              </div>
            </div>

            <div class="signature-box">
              ${signatureImage || "<p>Digital signature not provided</p>"}
            </div>
          </div>

          <div class="footer">
            <p>Fore Genomics - Parent Portal</p>
          </div>
        </body>
      </html>
    `;
  }
}

// Export singleton instance
export const browserlessPDFService = new BrowserlessPDFService();
