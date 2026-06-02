import nodemailer from 'nodemailer';

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

interface AdminOnboardingNotificationData {
	parentEmail: string;
	orderNumber: string;
	completedAt: Date;
}

interface AdminTRFApprovedNotificationData {
	orderNumber: string;
	kitNumber: number | string;
	approvedAt: Date;
	counselorEmail?: string;
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
			throw new Error(
				'Email configuration not found. SMTP_USER/GMAIL_USER and SMTP_PASS/GMAIL_APP_PASSWORD must be set.'
			);
		}

		// SMTP configuration - supports both Gmail and custom SMTP
		const smtpConfig = {
			host: process.env.SMTP_HOST || 'smtp.gmail.com',
			port: parseInt(process.env.SMTP_PORT || '465'), // Default to 465 for better compatibility
			secure: process.env.SMTP_SECURE === 'true' || !process.env.SMTP_PORT, // true for 465, false for other ports
			auth: {
				user,
				pass,
			},
			// Add timeout configuration to prevent hanging
			connectionTimeout: 10000, // 10 seconds
			greetingTimeout: 10000, // 10 seconds
			socketTimeout: 10000, // 10 seconds
		};

		this.transporter = nodemailer.createTransport(smtpConfig);
	}

	async sendInvitationCompleteNotification(
		data: InvitationNotificationData
	): Promise<void> {
		try {
			// Check if transporter is initialized
			if (!this.transporter) {
				throw new Error(
					'Email transporter not initialized, skipping invitation completion notification'
				);
			}

			const mailOptions = {
				from: `"Fore Genomics" <kyle@foregenomics.com>`,
				to: data.to,
				subject: `Parent Onboarding Completed - ${data.childName}`,
				html: this.generateInvitationCompleteEmailHTML(data),
			};

			await this.transporter.sendMail(mailOptions);
		} catch (error) {
			throw error; // Re-throw as this is important for the user
		}
	}

	async sendParentInvitation(data: ParentInvitationData): Promise<void> {
		try {
			// Check if transporter is initialized
			if (!this.transporter) {
				throw new Error(
					'Email transporter not initialized, skipping parent invitation'
				);
			}

			const mailOptions = {
				from: `"Fore Genomics" <kyle@foregenomics.com>`,
				to: data.to,
				subject: 'Welcome to the Fore Genomics Health Hub',
				html: this.generateParentInvitationEmailHTML(data),
			};

			await this.transporter.sendMail(mailOptions);
		} catch (error) {
			throw error; // Re-throw as this is important for the user
		}
	}

	async sendAdminOnboardingNotification(
		data: AdminOnboardingNotificationData
	): Promise<void> {
		try {
			// Check if transporter is initialized
			if (!this.transporter) {
				throw new Error(
					'Email transporter not initialized, skipping admin onboarding notification'
				);
			}

			// Get admin email addresses from environment variable
			const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS;
			if (!adminEmails) {
				throw new Error(
					'ADMIN_NOTIFICATION_EMAILS not configured, skipping admin notification'
				);
			}

			const mailOptions = {
				from: `"Fore Genomics" <kyle@foregenomics.com>`,
				to: adminEmails,
				subject: `New Onboarding Completed - ${data.orderNumber}`,
				html: this.generateAdminOnboardingNotificationHTML(data),
			};

			await this.transporter.sendMail(mailOptions);
		} catch (error) {
			// Don't throw error for admin notifications - they shouldn't break the user flow
		}
	}

	/**
	 * Notify admins when a counselor approves a TRF
	 */
	async sendAdminTRFApprovedNotification(
		data: AdminTRFApprovedNotificationData
	): Promise<void> {
		try {
			if (!this.transporter) {
				throw new Error(
					'Email transporter not initialized, skipping admin TRF approved notification'
				);
			}

			const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS;
			if (!adminEmails) {
				throw new Error(
					'ADMIN_NOTIFICATION_EMAILS not configured, skipping admin TRF approved notification'
				);
			}

			const mailOptions = {
				from: `"Fore Genomics" <kyle@foregenomics.com>`,
				to: adminEmails,
				subject: `TRF Approved - Order ${data.orderNumber} · Kit ${data.kitNumber}`,
				html: this.generateAdminTRFApprovedNotificationHTML(data),
			};

			await this.transporter.sendMail(mailOptions);
		} catch (error) {}
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
            <p><strong>Fore Genomics Health Hub</strong><br>
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
        <title>Welcome to the Fore Genomics Health Hub</title>
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
            <p><strong>Fore Genomics Health Hub</strong><br>
            This invitation was sent on behalf of ${data.inviterName}</p>
          </div>
        </div>
      </body>
      </html>
    `;
	}

	private generateAdminOnboardingNotificationHTML(
		data: AdminOnboardingNotificationData
	): string {
		return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>New Onboarding Completed - ${data.orderNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px; }
          .info-box { background-color: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .highlight { background-color: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          .status-badge { display: inline-block; background-color: #28a745; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 New Onboarding Completed</h1>
            <p>A parent has successfully completed the onboarding process</p>
          </div>

          <div class="content">
            <div class="status-badge">PREPARING ORDER</div>

            <h3>📋 Order Information</h3>
            <div class="info-box">
              <ul>
                <li><strong>Parent Email:</strong> ${data.parentEmail}</li>
                <li><strong>Order Number:</strong> ${data.orderNumber}</li>
                <li><strong>Completion Date:</strong> ${data.completedAt.toLocaleDateString()}</li>
                <li><strong>Completion Time:</strong> ${data.completedAt.toLocaleTimeString()}</li>
              </ul>
            </div>

            <h3>✅ What Was Completed</h3>
            <ul>
              <li>Parent contact information and verification</li>
              <li>Child's personal and medical information</li>
              <li>All required consent forms signed</li>
              <li>Health questionnaire completed</li>
              <li>TRF (Test Requisition Form) generated</li>
            </ul>

            <div class="highlight">
              <h4>🚀 Next Steps for Your Team</h4>
              <ol>
                <li><strong>Review the completed information</strong> in the admin dashboard</li>
                <li><strong>Generate consent PDFs</strong> on-demand as needed</li>
                <li><strong>Prepare the test kit</strong> for shipping</li>
                <li><strong>Update order status</strong> to "KIT_SHIPPED" when shipped</li>
                <li><strong>Send tracking information</strong> to the parent</li>
              </ol>
            </div>

            <h3>🔍 Admin Dashboard Access</h3>
            <p>You can view all order details and manage this onboarding in the admin dashboard.</p>
          </div>

          <div class="footer">
            <p><strong>Fore Genomics Health Hub</strong><br>
            This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
	}

	private generateAdminTRFApprovedNotificationHTML(
		data: AdminTRFApprovedNotificationData
	): string {
		const approvedDate = data.approvedAt;
		return `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>TRF Approved - Order ${data.orderNumber} · Kit ${data.kitNumber}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #0d6efd; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px; }
          .info-box { background-color: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0; }
          .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666; }
          .status-badge { display: inline-block; background-color: #0d6efd; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; font-weight: bold; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ TRF Approved</h1>
            <p>A counselor has approved a TRF</p>
          </div>
          <div class="content">
            <div class="status-badge">READY FOR LAB PROCESSING</div>
            <h3>📋 Details</h3>
            <div class="info-box">
              <ul>
                <li><strong>Order Number:</strong> ${data.orderNumber}</li>
                <li><strong>Kit Number:</strong> ${data.kitNumber}</li>
                <li><strong>Approved At:</strong> ${approvedDate.toLocaleDateString()} ${approvedDate.toLocaleTimeString()}</li>
                ${data.counselorEmail ? `<li><strong>Counselor:</strong> ${data.counselorEmail}</li>` : ''}
              </ul>
            </div>
            <p>The approved TRF has been generated and stored. You can view it in the admin dashboard.</p>
          </div>
          <div class="footer">
            <p><strong>Fore Genomics Health Hub</strong><br>
            This is an automated notification. Please do not reply to this email.</p>
          </div>
        </div>
      </body>
      </html>
    `;
	}

	/**
	 * Send daily notification to counselors about unapproved TRFs
	 */
	async sendCounselorNotificationEmail(
		counselorEmail: string,
		unapprovedCount: number
	): Promise<void> {
		if (!this.transporter) {
			throw new Error('Email transporter not initialized');
		}

		const subject = `Daily TRF Review Reminder - ${unapprovedCount} Unapproved TRF${unapprovedCount !== 1 ? 's' : ''}`;

		const textContent = this.generateCounselorNotificationText(unapprovedCount);

		await this.transporter.sendMail({
			from:
				process.env.SMTP_FROM ||
				process.env.SMTP_USER ||
				process.env.GMAIL_USER,
			to: counselorEmail,
			subject,
			text: textContent,
		});
	}

	/**
	 * Generate text content for counselor notification email
	 */
	private generateCounselorNotificationText(unapprovedCount: number): string {
		const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000/';
		const counselorDashboardUrl = `${appUrl}counselor`;

		return `
Daily TRF Review Reminder

Good morning!

There ${unapprovedCount === 1 ? 'is' : 'are'} currently ${unapprovedCount} unapproved TRF${unapprovedCount !== 1 ? 's' : ''} in the system that require your review and approval.

Please log into your counselor dashboard to review and approve these TRFs:

${counselorDashboardUrl}

Thank you for your attention to this matter.

--
Fore Genomics Health Hub
This is an automated daily reminder. Please do not reply to this email.
    `.trim();
	}

	/**
	 * Verify email configuration and test connection
	 */
	async verifyConnection(): Promise<boolean> {
		try {
			if (!this.transporter) {
				return false;
			}

			await this.transporter.verify();
			return true;
		} catch (error) {
			return false;
		}
	}
}

// Export singleton instance
export const emailService = new EmailService();
