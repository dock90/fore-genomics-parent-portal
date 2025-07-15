import nodemailer from 'nodemailer';

interface EmailData {
  userEmail: string;
  userName: string;
  childName: string;
  orderNumber: string;
  sheetUrl: string;
}

class EmailService {
  private transporter!: nodemailer.Transporter;

  constructor() {
    this.initializeTransporter();
  }

  private initializeTransporter() {
    // SMTP configuration - supports both Gmail and custom SMTP
    const smtpConfig = {
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER || process.env.GMAIL_USER,
        pass: process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD,
      },
    };

    this.transporter = nodemailer.createTransport(smtpConfig);
  }



  async sendAdminNotification(data: EmailData): Promise<void> {
    try {
      const adminEmails = process.env.ADMIN_EMAILS;
      if (!adminEmails) {
        console.warn('ADMIN_EMAILS not configured, skipping admin notification');
        return;
      }

      // Split by comma and trim whitespace
      const emailList = adminEmails.split(',').map(email => email.trim());

      const isProduction = process.env.NODE_ENV === 'production';
      const subjectPrefix = isProduction ? '' : '[TEST] ';
      
      const mailOptions = {
        from: `"Fore Genomics" <adam@foregenomics.com>`,
        to: emailList.join(', '),
        subject: `${subjectPrefix}New Onboarding Completed - ${data.userName} (${data.orderNumber})`,
        html: this.generateAdminEmailHTML(data),
      };

      await this.transporter.sendMail(mailOptions);
      console.log(`Admin notification email sent successfully to ${emailList.length} recipients`);
    } catch (error) {
      console.error('Failed to send admin notification email:', error);
      // Don't throw error as admin notification is not critical
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
}

// Export singleton instance
export const emailService = new EmailService(); 