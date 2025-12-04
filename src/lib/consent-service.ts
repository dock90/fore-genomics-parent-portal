import puppeteer from "puppeteer";

// Alternative PDF generation for serverless environments
let puppeteerAvailable = true;
try {
  // Test if puppeteer is available
  require.resolve("puppeteer");
} catch {
  puppeteerAvailable = false;
  console.warn(
    "Puppeteer not available, will use alternative PDF generation method"
  );
}

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

class ConsentPDFService {
  /**
   * Generate consent PDF on-demand
   * Returns the PDF buffer directly without storing it
   */
  async generateConsentPDF(
    data: ConsentPDFData
  ): Promise<{ pdfBuffer: Buffer; fileName: string }> {
    try {
      // Generate HTML content for the PDF
      const htmlContent = this.generateConsentHTMLInternal(data);

      let pdfBuffer: Buffer;

      // Check if we're in a serverless environment
      const isServerless =
        process.env.VERCEL || process.env.NODE_ENV === "production";

      if (isServerless) {
        try {
          // Use browserless.io REST API for serverless environments

          const response = await fetch(
            `https://production-sfo.browserless.io/pdf?token=${process.env.BROWSERLESS_TOKEN}`,
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

          const pdfArrayBuffer = await response.arrayBuffer();
          pdfBuffer = Buffer.from(pdfArrayBuffer);
        } catch (browserlessError) {
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
              "--disable-extensions",
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
              bottom: "0.5in",
              left: "0.5in",
            },
            printBackground: true,
          });

          pdfBuffer = Buffer.from(pdfUint8Array);

          await browser.close();
        } catch (puppeteerError) {
          // Fall back to alternative method
          pdfBuffer = await this.generatePDFFallback(htmlContent);
        }
      } else {
        // Use alternative method directly for environments without Puppeteer
        pdfBuffer = await this.generatePDFFallback(htmlContent);
      }

      // Generate filename for reference
      const kitNumberSuffix = data.kitNumber ? `-${data.kitNumber}` : "";
      const fileName = `${data.orderNumber}${kitNumberSuffix}-${new Date().toISOString().split("T")[0]}-consent.pdf`;

      return {
        pdfBuffer,
        fileName,
      };
    } catch (error) {
      console.error("Failed to generate consent PDF:", error);
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error occurred";
      throw new Error(`Failed to generate consent PDF: ${errorMessage}`);
    }
  }

  /**
   * @deprecated Use generateConsentPDF instead. This method is kept for backward compatibility.
   */
  async generateConsentPDFOnDemand(
    data: ConsentPDFData
  ): Promise<{ pdfBuffer: Buffer; fileName: string }> {
    return this.generateConsentPDF(data);
  }

  private async generatePDFFallback(htmlContent: string): Promise<Buffer> {
    // For serverless environments, we'll create a simple HTML file instead of PDF
    // This is a fallback when Puppeteer is not available
    // In production, you might want to use a service like DocRaptor, WeasyPrint, or similar

    // Check if we have an external PDF service configured
    if (process.env.PDF_SERVICE_URL) {
      try {
        const response = await fetch(process.env.PDF_SERVICE_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            html: htmlContent,
            format: "A4",
            margin: {
              top: "0.5in",
              right: "0.5in",
              bottom: "0.5in",
              left: "0.5in",
            },
          }),
        });

        if (!response.ok) {
          throw new Error(
            `PDF service returned ${response.status}: ${response.statusText}`
          );
        }

        const pdfArrayBuffer = await response.arrayBuffer();
        return Buffer.from(pdfArrayBuffer);
      } catch (error) {
        // Fall through to HTML fallback
      }
    }

    // Create a simple HTML file that can be converted to PDF later
    // This is a temporary solution - in production you should use a proper PDF service

    const htmlBuffer = Buffer.from(htmlContent, "utf-8");

    // Note: This is a temporary fallback. In production, you should:
    // 1. Use a PDF generation service (DocRaptor, WeasyPrint, etc.)
    // 2. Store the HTML and convert it to PDF when needed
    // 3. Use a different PDF library that works in serverless environments

    return htmlBuffer;
  }

  /**
   * Generate HTML content for consent (public method for viewing)
   */
  generateConsentHTML(data: ConsentPDFData): string {
    return this.generateConsentHTMLInternal(data);
  }

  private generateConsentHTMLInternal(data: ConsentPDFData): string {
    const signatureImage = data.consentData.signature || null;

    return `
      <!DOCTYPE html>
      <html lang="en">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Fore Genomics Consent Form</title>
        <style>
          body {
            font-family: Arial, sans-serif;
            line-height: 1.6;
            color: #333;
            max-width: 800px;
            margin: 0 auto;
            padding: 20px;
          }
          .header {
            text-align: center;
            border-bottom: 2px solid #333;
            padding-bottom: 20px;
            margin-bottom: 30px;
          }
          .header h1 {
            color: #2563eb;
            margin: 0;
            font-size: 24px;
          }
          .metadata {
            background-color: #f8f9fa;
            padding: 15px;
            border-radius: 5px;
            margin-bottom: 30px;
          }
          .metadata-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 10px;
          }
          .metadata-item {
            display: flex;
            justify-content: space-between;
          }
          .metadata-label {
            font-weight: bold;
          }
          .section {
            margin-bottom: 30px;
          }
          .section h2 {
            color: #2563eb;
            border-bottom: 1px solid #ddd;
            padding-bottom: 5px;
          }
          .consent-content {
            background-color: #fff;
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            margin-bottom: 15px;
          }
          .signature-section {
            margin-top: 30px;
            padding: 20px;
            border: 2px solid #333;
            border-radius: 5px;
          }
          .signature-image {
            max-width: 300px;
            max-height: 150px;
            border: 1px solid #ddd;
            margin-top: 10px;
          }
          .footer {
            margin-top: 40px;
            text-align: center;
            font-size: 12px;
            color: #666;
            border-top: 1px solid #ddd;
            padding-top: 20px;
          }
          .page-break {
            page-break-before: always;
          }
          @media print {
            body {
              margin: 0;
              padding: 15px;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>Fore Genomics Consent Form</h1>
          <p>Pediatric Health Screen - Informed Consent</p>
        </div>

        <div class="metadata">
          <h3>Consent Information</h3>
          <div class="metadata-grid">
            <div class="metadata-item">
              <span class="metadata-label">Order Number:</span>
              <span>${data.orderNumber}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Kit Number:</span>
              <span>${data.kitNumber || "N/A"}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Signer Name:</span>
              <span>${data.consentData.signerName || "N/A"}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Relationship to Child:</span>
              <span>${data.consentData.relationshipToChild || "N/A"}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Child Name:</span>
              <span>${data.childInfo.firstName} ${data.childInfo.lastName}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Child Date of Birth:</span>
              <span>${data.childInfo.dob || "N/A"}</span>
            </div>
            <div class="metadata-item">
              <span class="metadata-label">Signature Date:</span>
              <span>${data.consentData.signatureDate ? new Date(data.consentData.signatureDate).toLocaleDateString() : "N/A"}</span>
            </div>
          </div>
        </div>

        <div class="section">
          <h2>Introduction</h2>
          <div class="consent-content">
            <p>The Fore Genomics Pediatric Health Screen is developed based on a list of genes and related disease predispositions curated by Fore Genomics, Inc. Fore Genomics Pediatric Health Screen test involves the following service providers to provide the test. The genetic counseling is provided by Grey Genetics, LLC, with genetic counselors available in all 50 states. The physician authorization is provided by DNA Ally, a nationwide network of healthcare providers. The genetic test (including sequencing of samples, data analysis, and report generation) is performed by Inocras, Inc. at its CLIA-certified and CAP-accredited clinical laboratory located in San Diego, CA.</p>
          </div>
        </div>

        <div class="section">
          <h2>PART 1: Informed Consent to Fore Genomics Services</h2>
          <div class="consent-content">
            <p>By signing this form, I acknowledge and consent to the following additional terms and conditions:</p>
            <div>
              <strong>1.</strong> "Fore Genomics, Inc." shall mean Fore Genomics, Inc. – and/or its "Collaborators" which includes any lab, clinician, clinical facility, research partner, data partner, or other persons acting in any way for Fore Genomics, Inc. the corporation, and/or any and all of its former, current and future officers, directors, employees, agents, or contractors. Clinical laboratory testing of your child's sample will be performed by Fore Genomics' Collaborator, Inocras, Inc., located in San Diego, CA (herein-after "Inocras").
            </div>
            <div>
              <strong>2.</strong> Fore Genomics, Inc. uses electronic delivery for any official agreement, data, reports, analyses, or communications. Any hard copies (physical, printed versions) by mail or courier will be subject to additional processing and shipment fees payable by me at the then-current rates.
            </div>
            <div>
              <strong>3.</strong> Fore Genomics, Inc. uses facsimile or electronic signatures for all agreements, and email and cloud-based storage for notification and/or deliveries of all data after the initial physician's order. I am responsible for providing my correct and primary email address for electronic or facsimile signature and/or delivery of data, or for providing a different email address other than my own which I am authorized to use and from which I will sign agreements and consents in the future. This email address, or another which I designate to Fore Genomics, Inc. in the future, will be the primary means by which I will receive information from Fore Genomics, Inc.
            </div>
            <div>
              <strong>4.</strong> Fore Genomics, Inc. has my permission to contact any person(s) designated on this form designated by me who is not signing this form or who has not provided the information themselves, and further that Fore Genomics, Inc.'s permission to contact such person arises from their permission to contact me.
            </div>
            <div>
              <strong>5.</strong> Fore Genomics, Inc. will provide genetic counseling service and DNA data storage service with its collaborators. Any additional level of service I receive after these services will be defined under separate agreement between me and Fore Genomics, Inc.
            </div>
            <div>
              <strong>6.</strong> Fore Genomics, Inc. will receive all data subject to this form in accordance with my selections on this form.
            </div>
            <div>
              <strong>7.</strong> Fore Genomics, Inc. will store my child's genomic data in accordance with Fore Genomics' policies and procedures which I agree incorporates this consent and elections on this form and consent and specifically the Sections 8, 9, and 10 below by reference as if set forth fully therein and will further define the duration of my child's genome data storage as well as the level of services which I will receive. I understand I may elect to decline further services from Fore Genomics, Inc.
            </div>
            <div>
              <strong>8.</strong> I understand that genomics in general represent a significant advancement of science and technology, and that innovation does not occur without risk. I understand this risk sometimes means knowing something I didn't want to know, or missing something that I think I should have known sooner. Fore Genomics, Inc. makes no express or implied warranty as to the sufficiency, accuracy, or completeness of the results, analyses, reanalyses, or any interpretation of data associated with its products or services.
            </div>
            <div>
              <strong>9.</strong> I expressly waive any and all liability of, and/or claims (known or unknown) against Fore Genomics, Inc., its employees, its affiliates/Collaborators, its shareholders, its officers or directors by any definition, the ordering physician, the ordering physician's practice and any related person, or any other person for damages or relief, in any court for any cause of action in any jurisdiction, arising from testing, storage, interpretation, consulting, guidance, information, correlation of my genome, genes, DNA, data, or any other information pertaining to any other matter related thereto. I further agree to indemnify and hold harmless Fore Genomics, Inc. and its affiliates/Collaborators against any third party claims which may occur as a result of the information I learn, or the actions I take based upon such information, or for any other reason related to my genetic counseling, DNA, genes, testing, or consulting services and products of any form related thereto for any reason.
            </div>
            <div>
              <strong>10.</strong> California law shall govern this consent and future agreements between me and Fore Genomics, Inc. unless otherwise agreed in such future agreements. Following a notice of any claim by me or any person (as defined by <strong>California Evidence Code § 175</strong>) against Fore Genomics, Inc. or any person acting on your behalf or through any person, I expressly agree to sole venue for any and all disputes or claims for damages or other relief arising from this agreement or any other involving Fore Genomics, Inc., its affiliates, or its Collaborators to be JAMS (Irvine, California) mediation, followed by binding arbitration if mediation fails. I expressly agree and understand that, should my claim against Fore Genomics, Inc. be successful in arbitration, that my claim will never exceed a maximum of the amount of money paid by me to Fore Genomics, Inc. following the date of this consent to the date of such award, plus costs of mediation or arbitration. I expressly agree upon execution of this agreement that I will not commence, engage in, or otherwise support any class action or any other action for any reason whatsoever – and that this Section 10 is a material inducement by and between me and Fore Genomics, Inc. to provide any services hereunder and after the date hereof, and that this Section 10 shall remain in effect not less than ten years following the last date of the last payment of money made by me to Fore Genomics, Inc. or its affiliates, inclusive, or each of them.
            </div>

            <div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd;">
              <div style="display: flex; align-items: flex-start; gap: 10px;">
                <div style="width: 20px; height: 20px; border: 2px solid #333; display: flex; align-items: center; justify-content: center; margin-top: 2px;">
                  ${data.consentData.part1Accepted ? "✓" : ""}
                </div>
                <p style="margin: 0; flex: 1;">I have read, understood, and agree to the Informed Consent to Fore Genomics Services described in PART 1</p>
              </div>
            </div>
          </div>
        </div>

        <div class="page-break"></div>

        <div class="section">
          <h2>PART 2: Informed Consent for Genetic Testing</h2>
          <div class="consent-content">
            <p>Healthcare providers will review your submission and order Fore Genomics Pediatric Health Screen test(s). The Fore Genomics Pediatric Health Screen will be performed by Inocras Inc. ("we", "us", or "Inocras" in PART 2), a collaborator of Fore Genomics, Inc, at its clinical laboratory.</p>

            <div>
              <strong>What is this testing and why is it being done?</strong>
              <p>The test(s) to be ordered are genetic tests that involve whole genome sequencing (WGS). WGS examines all of the DNA in the human genetic code including coding and non-coding regions. Its purpose is to identify a genetic basis of an existing or potential disorder. WGS can aid in the diagnosis of patients who are thought to have a genetic condition when the exact condition is not clear. In these situations, WGS can be used instead of many individual genetic tests.</p>
            </div>

            <div>
              <strong>How is testing performed?</strong>
              <p>Testing is performed on a sample of your DNA collected on your buccal (cheek) swab and sent to us ("Sample"). Once collected, WGS will be performed on your Sample producing a large amount of genetic information. The WGS analysis can take into account any submitted clinical history, family history as well as currently available genetic information in medical literature and databases.</p>
            </div>

            <div>
              <strong>What is the benefit of this test and what might I learn from this test?</strong>
              <p>If you take this test, we may find gene variant(s) that are important to your health and/or the health of your relatives. In that case, you and your family may benefit from knowing that information. WGS is performed to identify a potential genetic basis for a condition affecting you, and results will be reported to help address that question.</p>

              <div>
                <strong>1. The results of this test could be:</strong>
                <div>
                  <strong>a. Positive, and may:</strong>
                  <ul>
                    <li>identify a likely diagnosis of a genetic condition; support treatment selection; or support clinical decision making.</li>
                    <li>identify a predisposition or an increased risk for developing a genetic disease in the future.</li>
                    <li>have implications for other family members.</li>
                  </ul>
                </div>
                <div>
                  <strong>b. Negative, and may:</strong>
                  <ul>
                    <li>reduce but not eliminate the possibility that your condition has a genetic basis.</li>
                    <li>reduce but not eliminate your predisposition or risk for developing a genetic disease in the future.</li>
                    <li>be uninformative.</li>
                    <li>not remove the need for additional testing.</li>
                  </ul>
                </div>
                <div>
                  <strong>c. Of uncertain significance, and may:</strong>
                  <ul>
                    <li>result in the recommendation of additional testing for you or the genetic testing of additional family members.</li>
                    <li>remain uncertain for the foreseeable future.</li>
                    <li>be resolved over time if additional information becomes available regarding the identified sequence variant. However, we will not necessarily update your test results or notify you even if additional information becomes available after the test.</li>
                    <li>lead to the recommendation of additional tests to clarify the findings, such as a muscle or skin biopsy or imaging (MRI/CT scan) to obtain more information about the significance of the genetic change.</li>
                  </ul>
                </div>
                <div>
                  <strong>d. Other than positive, negative or uncertain that reveals family relationships that do not conform to the family's view of such relationships. If such results have no impact on the health of the individual being tested, such findings are not communicated nor reported.</strong>
                </div>
              </div>

              <div>
                <strong>2. Secondary (incidental) findings:</strong>
                <p>This test(s) reports incidental findings in accordance with the recommendations published by the American College of Medical Genetics and Genomics (ACMG). ACMG has compiled a list of genes for which specific mutations are known to be causative of disorders with defined phenotypes that are clinically actionable by an accepted intervention (for more information, please see: <a href="https://pubmed.ncbi.nlm.nih.gov/34012068/">https://pubmed.ncbi.nlm.nih.gov/34012068/</a>). The ACMG recommends that, with the consent of the patient, variants detected in any of these genes by whole genome sequencing be reported, as they are of medical relevance and could be used in the future to inform clinical treatment.</p>
              </div>
            </div>

            <div>
              <strong>What are the risks and limitations of this testing?</strong>
              <p>The test is designed to provide insights to assist your healthcare provider to make informed decisions. However, the test reports do not provide a definitive medical diagnosis nor specific treatment recommendations. There is no guarantee that the test will yield clinically relevant information, impact your healthcare decisions, or otherwise lead to any particular or beneficial outcome. WGS has technical limitations that may prevent certain sequence changes in the DNA from being detected. This test may not be able to detect all types of DNA changes. The process of WGS is not 100% error-free. Possible sources of error can include: trace contamination, rare technical errors in the laboratory, DNA changes that compromise data analysis, inaccurate reporting of family relationships, or inaccurate or incomplete description of clinical findings. The analysis of variants in your genome is limited to a subset of all the variants in your genome; additional variants may exist and may contribute to or cause disease but not be identified or reported by this analysis due to technical limitations of the assay. This test does not sequence the DNA within mitochondria.</p>
              <p>The field is accumulating new information at a rapid rate, therefore over time, genetic changes that today have no association with disease may ultimately prove important for your health. We will have no obligation to conduct a reanalysis of your variants.</p>
              <p>Since some genetic variations may indicate future health problems for you and your relatives, this information might be of interest to healthcare providers, life insurance companies, and others. Federal and State laws provide some protections against discrimination based on genetic information. For example, the Genetic Information Nondiscrimination Act (GINA) makes it illegal for health insurance companies, group health plans, and employers with 15 or more employees to discriminate against you based on your genetic information. However, it does not prevent companies that sell life insurance, disability insurance, or long-term care insurance from using genetic information as a reason to deny coverage or set premiums. It is your responsibility to consider the possible impact of your test results as they relate to insurance rates, obtaining disability or life insurance and employment. For more information, please visit <a href="http://www.genome.gov/10002328">www.genome.gov/10002328</a>.</p>
            </div>

            <div>
              <strong>How will I learn my results?</strong>
              <p>Test reports are released to the certified healthcare provider(s) that orders your test. A copy will be provided to you by us through Fore Genomics if you request it. Test reports are confidential and will only be shared in accordance with applicable laws. Your test report is available for you to download from the Fore Genomics patient portal or can be requested by phone, email, or fax.</p>
            </div>

            <div>
              <strong>Who can I speak to about my test and results?</strong>
              <p>It is recommended that you consult with a genetic counselor or your healthcare provider before consenting to this test. It is also recommended that you speak to a genetic counselor or your healthcare provider about your results. You can contact a genetic counselor through telehealth or find a genetic counselor in your area on the National Society of Genetic Counselors' website (<a href="http://www.NSGC.org">www.NSGC.org</a>).</p>
            </div>

            <div>
              <strong>What happens to my data and sample?</strong>
              <p>We take robust measures to help keep your data safe, secure, and confidential and we limit the use of your data to only the permitted purposes. We use technical, administrative and physical safeguards to secure your data and protect it against misuse, loss, or alteration. We also take steps to de-identify or anonymize your data in accordance with applicable laws. De-identified data (also called pseudonymized data) is data that has been stripped of identifying information (such as your name or email address), although the data may contain a key that we can use to link back to the individual where required. Anonymized data is similar to de-identified data except that there is no ability to link the data back to an individual.</p>
              <p>The following activities are a core part of the Fore Genomics Pediatric Health Screen test services such that when you give your consent, you are consenting to these activities:</p>
              <ol>
                <li>Providing genetic testing services, including preparing and delivering a genetic test report to you and your healthcare providers. This also includes, in case of various failures, sending your Sample and data to a reference laboratory selected by us.</li>
                <li>Performing operational activities in support of the Fore Genomics Pediatric Health Screen test, such as billing for various services associated with the test. We may, through Fore Genomics, contact you via text or email (per your contact preference) as part of delivering the test results.</li>
                <li>Internal uses for validation, quality improvement, refining and updating classification of genetic variants, and product development related to genetic testing.</li>
                <li>Sharing of data that is summarized at a group or aggregate level rather than data that is specific to a single individual.</li>
                <li>Sharing of the contact information of your healthcare provider with third parties if your healthcare provider has provided consent.</li>
              </ol>
              <p>We may retain your data and Sample for as long as necessary for the purposes described above.</p>
            </div>

            <div>
              <strong>How can I find more information about how my data is used and shared?</strong>
              <p>We provide more information on how your data is used and shared through its Privacy Policy and HIPAA Notice of Privacy Practices. You can receive these documents by emailing <a href="mailto:inquiry@inocras.com">inquiry@inocras.com</a>.</p>
            </div>

            <div>
              <strong>ATTESTATION OF INFORMED CONSENT:</strong>
              <p>I have been given information about Inocras's whole genome sequencing test and Fore's Pediatric Genetic Health Screen. I understand the purpose of the test and the possible benefits and risks of the test. I have been given a full opportunity to ask questions that I may have about the test. I voluntarily agree to undergo this testing. I authorize Inocras to use my Samples for the purpose of the test.</p>
            </div>

            <div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd;">
              <div style="display: flex; align-items: flex-start; gap: 10px;">
                <div style="width: 20px; height: 20px; border: 2px solid #333; display: flex; align-items: center; justify-content: center; margin-top: 2px;">
                  ${data.consentData.part2Accepted ? "✓" : ""}
                </div>
                <p style="margin: 0; flex: 1;">I have read, understood, and agree to the Informed Consent for Genetic Testing described in PART 2</p>
              </div>
            </div>
          </div>
        </div>

        <div class="page-break"></div>

        <div class="section">
          <h2>PART 3: Informed Consent for Telehealth Services</h2>
          <div class="consent-content">
            <p>By checking the box below, I attest as follows:</p>
            <p>I have read and understood the Informed Consent Form in its entirety, including the explanation of why testing is being performed, how testing is performed and the risks associated with genetic testing. I have had the opportunity to ask my healthcare provider questions about the information contained herein. By checking the box below, I acknowledge my free consent to the test and to any additional consents indicated above, on behalf of myself and the child, and I acknowledge that such testing in no way guarantees my health, the patient's health, the health of an unborn child, or the health of other family members.</p>
            <p>I understand that by checking the boxes provided in this Informed Consent Form, I am acknowledging that I have read, understood, and certified the accuracy of the statements that correspond to each checkbox. I further understand that by checking the box below, I am agreeing to fully comply with the terms and conditions set forth in this Informed Consent Form. Lastly, I understand and agree that checking the boxes provided in this Informed Consent Form, including the box below, is equivalent to providing my signature and shall have the same binding legal effect as my signature.</p>

            <div>
              <p>Telehealth involves the use of secure electronic communications, information technology, or other means to enable a healthcare provider and a patient at different locations to communicate and share individual patient health information for the purpose of rendering clinical care. This "Telehealth Informed Consent" informs the patient ("patient," "you," or "your") concerning the treatment methods, risks, and limitations of using a telehealth platform as well as some of the means by which the healthcare provider and affiliates may communicate with you.</p>
            </div>

            <div>
              <strong>Services Provided:</strong>
              <p>Telehealth services offered by AMG Medical Group (DE), P.A, and its affiliated medical groups (collectively "Group"), and the Group's engaged providers (our "Providers" or your "Provider") may include a patient consultation, diagnosis, treatment recommendation, and/or a referral to in-person care, as determined clinically appropriate (the "Services"). Your Provider will be licensed in the state where you are located at the time of your consultation, or otherwise meet a professional licensure exception under applicable state law, and will establish a provider-patient relationship in accordance with the laws and rules in the applicable state.</p>
              <p>DNA Ally, Inc. ("DNA Ally") does not provide the Services; it performs administrative, payment, and other supportive activities for Group and our Providers.</p>
            </div>

            <div>
              <strong>Electronic Transmissions:</strong>
              <p>The types of electronic transmissions that may occur using the telehealth platform include, but are not limited to:</p>
              <ul>
                <li>Appointment scheduling;</li>
                <li>Completion, exchange, and review of medical intake forms and other clinically relevant information (for example: health records; images; output data from medical devices; sound and video files; diagnostic and/or lab test results) between you and your Provider via:
                  <ul>
                    <li>asynchronous communications;</li>
                    <li>two-way interactive audio in combination with store-and-forward communications; and/or</li>
                    <li>two-way interactive audio and video interaction;</li>
                  </ul>
                </li>
                <li>Treatment recommendations by your Provider based upon such review and exchange of clinical information;</li>
                <li>Delivery of a consultation report with a diagnosis, and/or treatment recommendations, as deemed clinically relevant; and/or</li>
                <li>Other electronic transmissions for the purpose of rendering clinical care to you.</li>
              </ul>
            </div>

            <div>
              <strong>Expected Benefits:</strong>
              <ul>
                <li>Improved access to care by enabling you to remain in your preferred location while your Provider consults with you.</li>
                <li>More efficient care evaluation and management.</li>
              </ul>
            </div>

            <div>
              <strong>Service Limitations:</strong>
              <ul>
                <li>The primary difference between telehealth and direct in-person service delivery is the inability to have direct, physical contact with the patient. Accordingly, some clinical needs may not be appropriate for a telehealth visit and your Provider will make that determination.</li>
                <li><strong>OUR PROVIDERS DO NOT ADDRESS MEDICAL EMERGENCIES. IF YOU BELIEVE YOU ARE EXPERIENCING A MEDICAL EMERGENCY, YOU SHOULD DIAL 9-1-1 AND/OR GO TO THE NEAREST EMERGENCY ROOM. PLEASE DO NOT ATTEMPT TO CONTACT DNA ALLY, INC., GROUP, OR YOUR PROVIDER. AFTER RECEIVING EMERGENCY HEALTHCARE TREATMENT, YOU SHOULD VISIT YOUR LOCAL PRIMARY CARE PROVIDER.</strong></li>
                <li>Our Providers are an addition to, and not a replacement for, your local primary care provider. Responsibility for your overall medical care should remain with your local primary care provider, if you have one, and we strongly encourage you to locate one if you do not.</li>
                <li>Group does not have any in-person clinic locations.</li>
              </ul>
            </div>

            <div>
              <strong>Security Measures:</strong>
              <p>The electronic communication systems we use will incorporate network and software security protocols to protect the confidentiality of patient identification and imaging data and will include measures to safeguard the data and to ensure its integrity against intentional or unintentional corruption. All the Services delivered to the patient through telehealth will be delivered over a secure connection that complies with the requirements of the Health Insurance Portability and Accountability Act of 1996 ("HIPAA").</p>
            </div>

            <div>
              <strong>Possible Risks:</strong>
              <ul>
                <li>Delays in evaluation and treatment could occur due to deficiencies or failures of the equipment and technologies, or provider availability.</li>
                <li>In the event of an inability to communicate as a result of a technological or equipment failure, please contact the Group at (800) 277-5098 AND <a href="mailto:yourfriends@DNAAlly.com">yourfriends@DNAAlly.com</a>.</li>
                <li>In rare events, your Provider may determine that the transmitted information is of inadequate quality, thus necessitating a rescheduled telehealth consult or an in-person meeting with your local primary care doctor.</li>
                <li>In very rare events, security protocols could fail, causing a breach of privacy of personal medical information.</li>
              </ul>
            </div>

            <div>
              <strong>Patient Acknowledgments:</strong>
              <p>I further acknowledge, understand, and agree to the following:</p>
              <ol>
                <li>I am at least eighteen (18) years of age and legal guardian for the child I am requesting the test for.</li>
                <li>I am the individual who will collect the sample for the Test(s) that I am requesting.</li>
                <li>A Group physician will determine whether or not Test(s) and Services are appropriate for me.</li>
                <li>My child's health information and results may be shared with other health care professionals including, but not limited to, physicians and counselors for purposes of providing Services.</li>
                <li>I have read and understand the benefits, risks, limitations and other information about the Test(s).</li>
                <li>The information I have provided in connection with Services is correct to the best of my knowledge. I will not hold Fore Genomics, DNA ALLY, Group or its health care providers responsible for any errors or omissions that I may have made in providing such information.</li>
                <li>Services do not constitute treatment of any condition, disease or illness.</li>
                <li>While Fore Genomics and DNA ALLY, Group, and the laboratories implement safeguards to avoid errors, as with all laboratory tests, there is a chance of a false positive or false negative result.</li>
                <li>I will not make medical decisions without consulting my primary care or disregard medical advice from my primary care or delay seeking such advice based on information as a result of the use of the Services.</li>
                <li>The scope of Services will be at the sole discretion of the healthcare provider conducting the Telemedicine Services, with no treatment or prescription. The healthcare provider will determine whether or not the Services being rendered are appropriate for a telehealth encounter.</li>
                <li>Healthcare services provided by Group may include physician oversight of laboratory testing for lab tests such as genetic tests (the "Test"), including, if applicable, without limitation, evaluation of the test request, ordering of a Test (if appropriate), receipt of Test results ("Results"), consultations by healthcare providers via telemedicine ("Consults"), customer support and any other related services. DNA ALLY and Group are not responsible for the laboratory services, the provision of the Test or other services provided by the company from which you requested the Test ("Test Provider") or through or in connection with Test Provider's website.</li>
                <li>If I am experiencing a medical emergency, I have been directed to dial 9-1-1 immediately and acknowledge my Provider is not able to connect me directly to any local emergency services.</li>
                <li>I may elect to seek services from a medical group with in-person clinics as an alternative to receiving telehealth services.</li>
                <li>I have the right to withhold or withdraw my consent to the use of telehealth in the course of my care at any time without affecting my right to future care or treatment.</li>
                <li>Federal and state law requires health care providers to protect the privacy and the security of health information. I am entitled to all confidentiality protections under applicable federal and state laws. I understand all medical reports resulting from the telehealth visit are part of my medical record.</li>
                <li>Group will take steps to make sure that my health information is not seen by anyone who should not see it. Telehealth may involve electronic communication of my personal health information to other health practitioners who may be located in other areas, including out of state.</li>
                <li>Dissemination of any patient-identifiable images or information from the DNA Ally telehealth visit to any third parties will not occur without my affirmative consent, except as permitted under HIPAA regulations.</li>
                <li>There is a risk of technical failures during the telehealth visit beyond the control of Group. I AGREE TO HOLD HARMLESS FORE GENOMICS, GROUP AND ITS EMPLOYEES, CONTRACTORS, AGENTS, DIRECTORS, MEMBERS, MANAGERS, SHAREHOLDERS, OFFICERS, REPRESENTATIVES, ASSIGNS, PARENTS, PREDECESSORS, AND SUCCESSORS FOR DELAYS IN EVALUATION OR FOR INFORMATION LOST DUE TO SUCH TECHNICAL FAILURES.</li>
                <li>In choosing to participate in a telehealth visit, I understand that some parts of the Services involving tests (e.g., labs or bloodwork) may be conducted at another location such as a testing facility, at the direction of my Provider.</li>
                <li>Persons may be present during the telehealth visit other than my Provider in order to operate the telehealth technologies. If another person is present during the telehealth visit, I will be informed of the individual's presence and his/her role and I have the right to request the following: (i) omit specific details of my medical history/examination that are personally sensitive to me; (ii) ask non-medical personnel to leave the telehealth consultation; and/or (iii) terminate the consultation at any time.</li>
                <li>I am responsible for checking for results notification.</li>
                <li>I am responsible for downloading and forwarding any results or records to my primary care or other personal physician and for initiating follow up, without delay, with such physician for care, diagnosis or medical treatment. I should not make medical decisions without consulting my personal physician.</li>
                <li>I have the right to request a copy of my medical records. I can request to obtain or send a copy of my medical records to my primary care or other designated health care provider by contacting Group at: <a href="mailto:yourfriends@dnaally.com">yourfriends@dnaally.com</a>. A copy will be provided to me at reasonable cost of preparation, shipping and delivery.</li>
                <li>There is no guarantee that I will be treated by a Group provider. My Provider reserves the right to deny care for potential misuse of the Services or for any other reason if, in the professional judgment of my Provider, the provision of the Services is not medically or ethically appropriate.</li>
                <li>I agree to receive communications from my Provider and DNA Ally, Inc. ("DNA Ally") and any of its affiliates or agents) by email, text message, phone or other method of communication.</li>
              </ol>
            </div>

            <div>
              <strong>Additional State-Specific Consents:</strong>
              <p>The following consents apply to patients accessing Group's website for the purposes of participating in a telehealth consultation as required by the states listed below:</p>

              <div>
                <strong>Iowa:</strong> I have been informed that if I want to register a formal complaint about a provider, I should visit the medical board's website, here: <a href="https://medicalboard.iowa.gov/consumers/filing-complaint">https://medicalboard.iowa.gov/consumers/filing-complaint</a>
              </div>
              <div>
                <strong>Idaho:</strong> I have been informed that if I want to register a formal complaint about a provider, I should visit the medical board's website, here: <a href="https://bom.idaho.gov/BOMPortal/AgencyAdditional.aspx?Agency=425&AgencyLinkID=650">https://bom.idaho.gov/BOMPortal/AgencyAdditional.aspx?Agency=425&AgencyLinkID=650</a>
              </div>
              <div>
                <strong>Indiana:</strong> I have been informed that if I want to register a formal complaint about a provider, I should visit the medical board's website, here: <a href="https://www.in.gov/attorneygeneral/2434.htm">https://www.in.gov/attorneygeneral/2434.htm</a>
              </div>
              <div>
                <strong>Kentucky:</strong> I have been informed that if I want to register a formal complaint about a provider, I should visit the medical board's website, here: <a href="https://kbml.ky.gov/grievances/Pages/default.aspx">https://kbml.ky.gov/grievances/Pages/default.aspx</a>
              </div>
              <div>
                <strong>Maine:</strong> I have been informed that if I want to register a formal complaint about a provider, I should visit the medical board's website, here: <a href="https://www.maine.gov/md/discipline/file-complaint.html">https://www.maine.gov/md/discipline/file-complaint.html</a>
              </div>
              <div>
                <strong>Oklahoma:</strong> I have been informed that if I want to register a formal complaint about a provider, I should visit the medical board's website, here:
                <ul>
                  <li>Oklahoma Board of Medical Licensure and Supervision: <a href="http://www.okmedicalboard.org/complaint">http://www.okmedicalboard.org/complaint</a></li>
                  <li>Oklahoma Board of Osteopathic Examiners: <a href="https://www.ok.gov/osboe/faqs.html">https://www.ok.gov/osboe/faqs.html</a></li>
                </ul>
              </div>
              <div>
                <strong>Texas:</strong> I have been informed of the following notice:
                <p><strong>NOTICE CONCERNING COMPLAINTS</strong> - Complaints about physicians, as well as other licensees and registrants of the Texas Medical Board, including physician assistants, acupuncturists, and surgical assistants may be reported for investigation at the following address: Texas Medical Board, Attention: Investigations, 333 Guadalupe, Tower 3, Suite 610, P.O. Box 2018, MC-263, Austin, Texas 78768-2018, Assistance in filing a complaint is available by calling the following telephone number: 1-800-201-9353, For more information, please visit our website at <a href="http://www.tmb.state.tx.us">www.tmb.state.tx.us</a>.</p>
                <p><strong>AVISO SOBRE LAS QUEJAS</strong> - Las quejas sobre médicos, asi como sobre otros profesionales acreditados e inscritos del Consejo Médico de Tejas, incluyendo asistentes de médicos, practicantes de acupuntura y asistentes de cirugia, se pueden presentar en la siguiente dirección para ser investigadas: Texas Medical Board, Attention: Investigations, 333 Guadalupe, Tower 3, Suite 610, P.O. Box 2018, MC-263, Austin, Texas 78768-2018, Si necesita ayuda para presentar una queja, llame al: 1-800-201-9353, Para obtener más información, visite nuestro sitio web en <a href="http://www.tmb.state.tx.us">www.tmb.state.tx.us</a></p>
              </div>
              <div>
                <strong>Vermont:</strong> I have been informed that if I want to register a formal complaint about a provider, I should visit the medical board's website, here:
                <ul>
                  <li>Vermont Board of Medical Practice: <a href="http://www.healthvermont.gov/health-professionals-systems/board-medical-practice/file-complaint">http://www.healthvermont.gov/health-professionals-systems/board-medical-practice/file-complaint</a></li>
                  <li>Vermont Board of Osteopathic Examiners: <a href="http://www.healthvermont.gov/health-professionals-systems/board-osteopathic-examiners">http://www.healthvermont.gov/health-professionals-systems/board-osteopathic-examiners</a></li>
                </ul>
              </div>
            </div>

            <div>
              <strong>PATIENT CONSENT</strong>
              <p>I have read this document carefully and understand the risks and benefits of the telehealth consultation and have had my questions regarding the procedure explained and I hereby give my informed consent to participate in a telehealth consultation and communicate/receive communications under the terms described herein.</p>
            </div>

            <div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd;">
              <div style="display: flex; align-items: flex-start; gap: 10px;">
                <div style="width: 20px; height: 20px; border: 2px solid #333; display: flex; align-items: center; justify-content: center; margin-top: 2px;">
                  ${data.consentData.part3Accepted ? "✓" : ""}
                </div>
                <p style="margin: 0; flex: 1;">I have read, understood, and agree to the Informed Consent for Telehealth Services described in PART 3</p>
              </div>
            </div>
          </div>
        </div>

        <div class="signature-section">
          <h3>Electronic Signature</h3>
          <p><strong>Signer:</strong> ${data.consentData.signerName || "N/A"}</p>
          <p><strong>Date:</strong> ${data.consentData.signatureDate ? new Date(data.consentData.signatureDate).toLocaleDateString() : "N/A"}</p>
          <p><strong>Relationship to Child:</strong> ${data.consentData.relationshipToChild || "N/A"}</p>
          <p><strong>Child's Full Name:</strong> ${data.childInfo.firstName} ${data.childInfo.lastName}</p>
          <p><strong>Child's Date of Birth:</strong> ${data.childInfo.dob || "N/A"}</p>

          <div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd;">
            <div style="display: flex; align-items: flex-start; gap: 10px;">
              <div style="width: 20px; height: 20px; border: 2px solid #333; display: flex; align-items: center; justify-content: center; margin-top: 2px;">
                ${data.consentData.consentAll ? "✓" : ""}
              </div>
              <p style="margin: 0; flex: 1;">I agree to the terms and conditions specified in Parts 1, 2 and 3 of this document</p>
            </div>
          </div>

          ${signatureImage ? `<img src="${signatureImage}" alt="Electronic Signature" class="signature-image" />` : "<p><em>No signature provided</em></p>"}
        </div>
      </body>
      </html>
    `;
  }
}

// Export singleton instance
export const consentPDFService = new ConsentPDFService();
