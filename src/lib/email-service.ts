import nodemailer from "nodemailer";

interface EmailData {
  userEmail: string;
  userName: string;
  childName: string;
  orderNumber: string;
  sheetUrl: string;
}

interface InvitationNotificationData {
  to: string;
  childName: string;
  parentEmail: string;
}

interface ParentInvitationData {
  to: string;
  childName: string;
  inviterName: string;
}

interface OrderCreationData {
  to: string;
  userName: string;
  orderNumber: string;
  kitCount: number;
}

class EmailService {
  private transporter!: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // Check if email configuration is available
    const user = process.env.SMTP_USER || process.env.GMAIL_USER;
    const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

    if (!user || !pass) {
      console.warn(
        "Email configuration not found. SMTP_USER/GMAIL_USER and SMTP_PASS/GMAIL_APP_PASSWORD must be set."
      );
      return;
    }

    // SMTP configuration - supports both Gmail and custom SMTP
    const smtpConfig = {
      host: process.env.SMTP_HOST || "smtp.gmail.com",
      port: parseInt(process.env.SMTP_PORT || "465"), // Default to 465 for better compatibility
      secure: process.env.SMTP_SECURE === "true" || !process.env.SMTP_PORT, // true for 465, false for other ports
      auth: {
        user,
        pass,
      },
      // Add timeout configuration to prevent hanging
      connectionTimeout: 10000, // 10 seconds
      greetingTimeout: 10000, // 10 seconds
      socketTimeout: 10000, // 10 seconds
    };

    console.log("Initializing email transporter with host:", smtpConfig.host);
    this.transporter = nodemailer.createTransport(smtpConfig);
  }

  async sendAdminNotification(data: EmailData): Promise<void> {
    try {
      // Check if transporter is initialized
      if (!this.transporter) {
        console.warn(
          "Email transporter not initialized, skipping admin notification"
        );
        return;
      }

      const adminEmails = process.env.ADMIN_EMAILS;
      if (!adminEmails) {
        console.warn(
          "ADMIN_EMAILS not configured, skipping admin notification"
        );
        return;
      }

      // Split by comma and trim whitespace
      const emailList = adminEmails.split(",").map((email) => email.trim());

      const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";
      const subjectPrefix = isTestMode ? "[TEST] " : "";

      const mailOptions = {
        from: `"Fore Genomics" <adam@foregenomics.com>`,
        to: emailList.join(", "),
        subject: `${subjectPrefix}New Onboarding Completed - ${data.userName} (${data.orderNumber})`,
        html: this.generateAdminEmailHTML(data),
      };

      console.log("Attempting to send admin notification email...");
      await this.transporter.sendMail(mailOptions);
      console.log(
        `Admin notification email sent successfully to ${emailList.length} recipients`
      );
    } catch (error) {
      console.error("Failed to send admin notification email:", error);
      // Don't throw error as admin notification is not critical
    }
  }

  async sendInvitationCompleteNotification(
    data: InvitationNotificationData
  ): Promise<void> {
    try {
      // Check if transporter is initialized
      if (!this.transporter) {
        console.warn(
          "Email transporter not initialized, skipping invitation completion notification"
        );
        return;
      }

      const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";
      const subjectPrefix = isTestMode ? "[TEST] " : "";

      const mailOptions = {
        from: `"Fore Genomics" <adam@foregenomics.com>`,
        to: data.to,
        subject: `${subjectPrefix}Parent Onboarding Completed - ${data.childName}`,
        html: this.generateInvitationCompleteEmailHTML(data),
      };

      console.log("Attempting to send invitation completion notification...");
      await this.transporter.sendMail(mailOptions);
      console.log(
        `Invitation completion notification sent successfully to ${data.to}`
      );
    } catch (error) {
      console.error(
        "Failed to send invitation completion notification:",
        error
      );
      throw error; // Re-throw as this is important for the user
    }
  }

  async sendParentInvitation(data: ParentInvitationData): Promise<void> {
    try {
      // Check if transporter is initialized
      if (!this.transporter) {
        console.warn(
          "Email transporter not initialized, skipping parent invitation"
        );
        return;
      }

      const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";
      const subjectPrefix = isTestMode ? "[TEST] " : "";

      const mailOptions = {
        from: `"Fore Genomics" <adam@foregenomics.com>`,
        to: data.to,
        subject: `${subjectPrefix}Welcome to the Fore Genomics Parent Portal`,
        html: this.generateParentInvitationEmailHTML(data),
      };

      console.log("Attempting to send parent invitation email...");
      await this.transporter.sendMail(mailOptions);
      console.log(`Parent invitation email sent successfully to ${data.to}`);
    } catch (error) {
      console.error("Failed to send parent invitation email:", error);
      throw error; // Re-throw as this is important for the user
    }
  }

  async sendOrderCreationEmail(data: OrderCreationData): Promise<void> {
    try {
      // Check if transporter is initialized
      if (!this.transporter) {
        console.warn(
          "Email transporter not initialized, skipping order creation email"
        );
        return;
      }

      const isTestMode = process.env.NEXT_PUBLIC_TEST_MODE === "true";
      const subjectPrefix = isTestMode ? "[TEST] " : "";

      const mailOptions = {
        from: `"Fore Genomics" ${isTestMode ? "<parent.portal-dev@foregenomics.com>" : "<parent.portal@foregenomics.com>"}`,
        to: data.to,
        subject: `${subjectPrefix}Your Fore Genomics Parent Portal Is Ready to Activate`,
        html: this.generateOrderCreationEmailHTML(data),
      };

      console.log("Attempting to send order creation email...");
      await this.transporter.sendMail(mailOptions);
      console.log(`Order creation email sent successfully to ${data.to}`);
    } catch (error) {
      console.error("Failed to send order creation email:", error);
      throw error; // Re-throw as this is important for the user
    }
  }

  private generateAdminEmailHTML(data: EmailData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Onboarding - ${data.userName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px; }
          .button { display: inline-block; padding: 12px 24px; background-color: #007bff; color: white; text-decoration: none; border-radius: 4px; margin: 20px 0; }
          .info-box { background-color: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🆕 New Onboarding Completed</h1>
            <p>A new user has completed the onboarding process</p>
          </div>
          
          <div class="content">
            <h3>📋 User Information</h3>
            <div class="info-box">
              <ul>
                <li><strong>User Name:</strong> ${data.userName}</li>
                <li><strong>User Email:</strong> ${data.userEmail}</li>
                <li><strong>Child Name:</strong> ${data.childName}</li>
                <li><strong>Order Number:</strong> ${data.orderNumber}</li>
                <li><strong>Submission Date:</strong> ${new Date().toLocaleDateString()}</li>
              </ul>
            </div>
            
            <h3>📄 Test Requisition Form</h3>
            <a href="${data.sheetUrl}" class="button">Download TRF</a>
          
          <div class="footer">
            <p><strong>Fore Genomics Parent Portal</strong><br>
            This notification was automatically generated</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateInvitationCompleteEmailHTML(
    data: InvitationNotificationData
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Parent Onboarding Completed - ${data.childName}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px; }
          .info-box { background-color: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Parent Onboarding Completed</h1>
            <p>The parent or legal guardian has completed the onboarding process</p>
          </div>
          
          <div class="content">
            <h3>📋 Child Information</h3>
            <div class="info-box">
              <ul>
                <li><strong>Child Name:</strong> ${data.childName}</li>
                <li><strong>Parent Email:</strong> ${data.parentEmail}</li>
                <li><strong>Completion Date:</strong> ${new Date().toLocaleDateString()}</li>
              </ul>
            </div>
            
            <h3>🎉 What happens next?</h3>
            <p>The parent or legal guardian has successfully completed all required steps:</p>
            <ul>
              <li>✅ Provided their contact information</li>
              <li>✅ Completed the child's information</li>
              <li>✅ Signed all consent forms</li>
              <li>✅ Answered health questionnaire</li>
            </ul>
            
            <p><strong>Next Steps:</strong></p>
            <ul>
              <li>Our team will review the information</li>
              <li>A test kit will be prepared and shipped</li>
              <li>The parent will receive tracking information</li>
            </ul>
          
          <div class="footer">
            <p><strong>Fore Genomics Parent Portal</strong><br>
            Thank you for helping connect us with the child's parent or legal guardian.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateParentInvitationEmailHTML(
    data: ParentInvitationData
  ): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Welcome to the Fore Genomics Parent Portal</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px; }
          .info-box { background-color: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .warning { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🧬 Complete Onboarding to Proceed with Your Child's Genetic Testing</h1>
          </div>
          
          <div class="content">
            <h3>📋 About This Invitation</h3>
            <p><strong>${data.inviterName}</strong> has purchased genetic testing for <strong>${data.childName}</strong> and has identified you as the parent or legal guardian. Only parents or legal guardians can provide consent for genetic testing.</p>
            
            <div class="warning">
              <h4>📧 Check Your Email</h4>
              <p>You will receive a separate email with a secure invitation link to complete the onboarding process. Please check your inbox (and spam folder) for this invitation.</p>
            </div>
            
            <div class="info-box">
              <h4>📝 What You'll Need to Complete</h4>
              <ul>
                <li>Your personal information and contact details</li>
                <li>Your child's information (name, date of birth, etc.)</li>
                <li>Consent forms for genetic testing</li>
                <li>Medical questionnaire</li>
              </ul>
            </div>
            
            <div class="warning">
              <h4>⚠️ Important Information</h4>
              <ul>
                <li>You'll need approximately 5-10 minutes to complete the process</li>
                <li>All information is kept confidential and secure</li>
                <li>The invitation link is unique to you and should not be shared</li>
                <li>If you don't receive the invitation email, please check your spam folder</li>
              </ul>
            </div>
            
            <h3>🔒 Security Note</h3>
            <p>The invitation link will be sent in a separate secure email. If you have any issues accessing the portal, please contact us directly.</p>
          </div>
          
          <div class="footer">
            <p><strong>Fore Genomics Parent Portal</strong><br>
            This invitation was sent on behalf of ${data.inviterName}</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  private generateOrderCreationEmailHTML(data: OrderCreationData): string {
    return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Your Fore Genomics Parent Portal Is Ready to Activate</title>
        <style>
          body { 
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; 
            line-height: 1.6; 
            color: #2d3748; 
            background-color: #f7fafc;
            margin: 0;
            padding: 0;
          }
          .container { 
            max-width: 600px; 
            margin: 0 auto; 
            background-color: #ffffff;
            border-radius: 12px;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.05);
            overflow: hidden;
          }
          .header { 
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white; 
            padding: 40px 30px; 
            text-align: center; 
          }
          .header h1 {
            margin: 0 0 16px 0;
            font-size: 28px;
            font-weight: 700;
            letter-spacing: -0.025em;
          }
          .header p {
            margin: 0;
            font-size: 16px;
            opacity: 0.95;
            line-height: 1.5;
          }
          .content { 
            padding: 40px 30px; 
          }
          .warning { 
            background: linear-gradient(135deg, #fef5e7 0%, #fed7aa 100%);
            border: 1px solid #f59e0b;
            border-radius: 8px; 
            padding: 24px; 
            margin: 24px 0;
            position: relative;
          }
          .warning::before {
            content: "📧";
            font-size: 24px;
            position: absolute;
            top: -12px;
            left: 20px;
            background: white;
            padding: 4px 8px;
            border-radius: 50%;
            border: 2px solid #f59e0b;
          }
          .warning h4 {
            margin: 0 0 12px 0;
            color: #92400e;
            font-size: 18px;
            font-weight: 600;
          }
          .warning p {
            margin: 0;
            color: #78350f;
            font-size: 15px;
            line-height: 1.5;
          }
          .footer { 
            margin-top: 40px; 
            padding: 30px; 
            background-color: #f8fafc;
            text-align: center;
            border-top: 1px solid #e2e8f0;
          }
          .footer p {
            margin: 0;
            font-size: 14px; 
            color: #64748b;
            line-height: 1.5;
          }
          @media only screen and (max-width: 600px) {
            .container {
              margin: 0;
              border-radius: 0;
            }
            .header, .content, .footer {
              padding: 24px 20px;
            }
            .header h1 {
              font-size: 24px;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Your Fore Genomics Parent Portal Is Ready to Activate</h1>
            <p>Thanks for your purchase! Your Parent Portal is now ready to set up — the place to follow your child's genetic testing progress and access personalized health insights.</p>
          </div>
          
          <div class="content">
            <div class="warning">
              <h4>Check Your Email</h4>
              <p>You will receive a separate email with a secure invitation link to complete the onboarding process. Please check your inbox (and spam folder) for this invitation.</p>
            </div>
          </div>
          
          <div class="footer">
            <p><strong>Fore Genomics</strong><br>
            Thank you for choosing Fore Genomics for your genetic testing needs.</p>
          </div>
        </div>
      </body>
      </html>
    `;
  }

  /**
   * Verify email configuration and test connection
   */
  async verifyConnection(): Promise<boolean> {
    try {
      if (!this.transporter) {
        console.warn("Email transporter not initialized");
        return false;
      }

      console.log("Verifying email connection...");
      await this.transporter.verify();
      console.log("Email connection verified successfully");
      return true;
    } catch (error) {
      console.error("Email connection verification failed:", error);
      return false;
    }
  }
}

// Export singleton instance
export const emailService = new EmailService();
