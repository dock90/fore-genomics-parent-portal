const nodemailer = require("nodemailer");

async function testEmailConfig() {
  console.log("Testing email configuration...");

  // Check environment variables
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  const host = process.env.SMTP_HOST || "smtp.gmail.com";
  const port = parseInt(process.env.SMTP_PORT || "465");
  const secure = process.env.SMTP_SECURE === "true" || !process.env.SMTP_PORT;

  console.log("Email Configuration:");
  console.log("- Host:", host);
  console.log("- Port:", port);
  console.log("- Secure:", secure);
  console.log("- User:", user ? "Set" : "Not set");
  console.log("- Password:", pass ? "Set" : "Not set");

  if (!user || !pass) {
    console.error("❌ Email credentials not configured");
    console.log(
      "Please set SMTP_USER/GMAIL_USER and SMTP_PASS/GMAIL_APP_PASSWORD environment variables"
    );
    return;
  }

  // Create transporter
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure,
    auth: { user, pass },
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 10000,
  });

  try {
    console.log("\nVerifying connection...");
    await transporter.verify();
    console.log("✅ Email connection verified successfully");

    // Test sending a simple email
    console.log("\nTesting email send...");
    const info = await transporter.sendMail({
      from: `"Test" <${user}>`,
      to: "test@example.com",
      subject: "Test Email",
      text: "This is a test email to verify configuration.",
    });

    console.log("✅ Test email sent successfully");
    console.log("Message ID:", info.messageId);
  } catch (error) {
    console.error("❌ Email test failed:", error.message);
    if (error.code) {
      console.error("Error code:", error.code);
    }
  }
}

testEmailConfig();
