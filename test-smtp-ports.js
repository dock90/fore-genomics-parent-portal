const nodemailer = require('nodemailer');

async function testSMTPConfig(config, name) {
  console.log(`\n🧪 Testing ${name}...`);
  console.log(`Host: ${config.host}:${config.port}, Secure: ${config.secure}`);
  
  const transporter = nodemailer.createTransport(config);
  
  try {
    await transporter.verify();
    console.log(`✅ ${name} - Connection successful!`);
    return true;
  } catch (error) {
    console.log(`❌ ${name} - Failed: ${error.message}`);
    return false;
  }
}

async function testAllConfigs() {
  const user = process.env.SMTP_USER || process.env.GMAIL_USER;
  const pass = process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD;
  
  if (!user || !pass) {
    console.error('❌ Email credentials not configured');
    return;
  }
  
  const configs = [
    {
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    },
    {
      host: 'smtp.gmail.com',
      port: 465,
      secure: true,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    },
    {
      host: 'smtp.gmail.com',
      port: 25,
      secure: false,
      auth: { user, pass },
      connectionTimeout: 5000,
      greetingTimeout: 5000,
      socketTimeout: 5000,
    }
  ];
  
  console.log('🔍 Testing different SMTP configurations...');
  
  for (const config of configs) {
    const name = `Gmail ${config.port}${config.secure ? ' (SSL)' : ''}`;
    await testSMTPConfig(config, name);
  }
  
  console.log('\n💡 If all fail, try:');
  console.log('1. Switch to a different network (home WiFi, mobile hotspot)');
  console.log('2. Use a different email service (SendGrid, Mailgun)');
  console.log('3. Check if your Gmail app password is correct');
}

testAllConfigs(); 