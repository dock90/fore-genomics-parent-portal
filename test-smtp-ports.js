const nodemailer = require("nodemailer");

async function testSMTPConfig(config, name) {
  const transporter = nodemailer.createTransport(config);

  try {
    await transporter.verify();
    return true;
  } catch (error) {
    return false;
  }
}

async function testAllConfigs() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;

  if (!user || !pass) {
    console.error("❌ Email credentials not configured");
    return;
  }

  const configs = [
    {
      host: "smtp.gmail.com",
      port: 587,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    },
    {
      host: "smtp.gmail.com",
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    },
    {
      host: "smtp.gmail.com",
      port: 25,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    },
  ];

  for (const config of configs) {
    const name = `Gmail ${config.port}${config.secure ? " (SSL)" : ""}`;
    await testSMTPConfig(config, name);
  }
}

testAllConfigs();
