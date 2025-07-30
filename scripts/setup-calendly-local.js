#!/usr/bin/env node

const { execSync } = require('child_process');
const readline = require('readline');

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

function question(prompt) {
  return new Promise((resolve) => {
    rl.question(prompt, resolve);
  });
}

async function setupCalendlyLocal() {
  console.log('🚀 Calendly Local Webhook Setup');
  console.log('================================');
  console.log('');

  try {
    // Check if ngrok is installed
    try {
      execSync('ngrok version', { stdio: 'ignore' });
      console.log('✅ ngrok is installed');
    } catch (error) {
      console.log('❌ ngrok is not installed');
      console.log('');
      console.log('Please install ngrok first:');
      console.log('  brew install ngrok  # macOS');
      console.log('  # Or download from https://ngrok.com/download');
      console.log('');
      process.exit(1);
    }

    // Check if development server is running
    try {
      execSync('curl -s http://localhost:3000 > /dev/null', { stdio: 'ignore' });
      console.log('✅ Development server is running on port 3000');
    } catch (error) {
      console.log('❌ Development server is not running on port 3000');
      console.log('');
      console.log('Please start your development server first:');
      console.log('  npm run dev');
      console.log('');
      process.exit(1);
    }

    // Get ngrok URL
    console.log('');
    console.log('📋 Please provide your ngrok HTTPS URL:');
    console.log('  (Run "ngrok http 3000" in another terminal and copy the HTTPS URL)');
    console.log('');
    
    const ngrokUrl = await question('Enter ngrok HTTPS URL (e.g., https://abc123.ngrok.io): ');
    
    if (!ngrokUrl.startsWith('https://')) {
      console.log('❌ Please provide a valid HTTPS URL');
      process.exit(1);
    }

    const webhookUrl = `${ngrokUrl}/api/webhooks/calendly`;
    
    console.log('');
    console.log('🔗 Webhook URL will be:', webhookUrl);
    console.log('');

    // Set environment variable
    process.env.CALENDLY_WEBHOOK_URL = webhookUrl;
    
    // Test the webhook endpoint
    console.log('🧪 Testing webhook endpoint...');
    try {
      const testResponse = execSync(`curl -s ${webhookUrl}/test`, { encoding: 'utf8' });
      console.log('✅ Webhook endpoint is accessible');
      console.log('Response:', testResponse.trim());
    } catch (error) {
      console.log('❌ Webhook endpoint is not accessible');
      console.log('Make sure your development server is running and ngrok is forwarding correctly');
      process.exit(1);
    }

    console.log('');
    console.log('🔧 Setting up Calendly webhooks...');
    console.log('');

    // Run the webhook setup script
    try {
      execSync('node scripts/setup-calendly-webhooks-simple.js', { 
        stdio: 'inherit',
        env: { ...process.env, CALENDLY_WEBHOOK_URL: webhookUrl }
      });
    } catch (error) {
      console.log('');
      console.log('❌ Webhook setup failed');
      console.log('Make sure you have:');
      console.log('1. Calendly OAuth set up (run: npm run setup-calendly-oauth)');
      console.log('2. Valid Calendly credentials in your .env.local file');
      process.exit(1);
    }

    console.log('');
    console.log('🎉 Setup complete!');
    console.log('');
    console.log('📝 Next steps:');
    console.log('1. Add the signing key to your .env.local file');
    console.log('2. Keep ngrok running in another terminal');
    console.log('3. Test by creating/canceling appointments in Calendly');
    console.log('4. Watch your server logs for webhook events');
    console.log('');
    console.log('💡 Useful commands:');
    console.log('  npm run dev                    # Start development server');
    console.log('  ngrok http 3000               # Start ngrok (in another terminal)');
    console.log('  npm run setup-calendly-webhooks # Re-run webhook setup');
    console.log('  curl ${webhookUrl}/test       # Test webhook endpoint');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
    process.exit(1);
  } finally {
    rl.close();
  }
}

setupCalendlyLocal(); 