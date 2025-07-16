const nodemailer = require('nodemailer');

async function testEmail() {
  console.log('Testing email functionality...');
  
  // Create transporter
  const transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: {
      user: process.env.GMAIL_USER,
      pass: process.env.GMAIL_APP_PASSWORD,
    },
  });

  // Test email
  const mailOptions = {
    from: `"Fore Genomics" <${process.env.GMAIL_USER}>`,
    to: 'adam.land+test@gmail.com', // Test email
    subject: '[TEST] Invitation Completion Notification',
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Test Email</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background-color: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px; }
          .content { padding: 20px; }
          .info-box { background-color: #e9ecef; padding: 15px; border-radius: 4px; margin: 20px 0; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Test Email - Parent Onboarding Completed</h1>
            <p>This is a test of the invitation completion notification system</p>
          </div>
          
          <div class="content">
            <h3>📋 Test Information</h3>
            <div class="info-box">
              <ul>
                <li><strong>Child Name:</strong> Test Child</li>
                <li><strong>Parent Email:</strong> test@example.com</li>
                <li><strong>Test Date:</strong> ${new Date().toLocaleDateString()}</li>
              </ul>
            </div>
            
            <p>If you received this email, the notification system is working correctly!</p>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log('✅ Test email sent successfully!');
    console.log('Message ID:', info.messageId);
    console.log('Preview URL:', nodemailer.getTestMessageUrl(info));
  } catch (error) {
    console.error('❌ Failed to send test email:', error);
  }
}

testEmail(); 