const https = require('https');

console.log('🚀 Calendly Staging Setup');
console.log('=========================');
console.log('');

// Configuration
const STAGING_DOMAIN = 'https://fore-genomics-parent-portal-env-staging-adam-lands-projects.vercel.app';
const CLIENT_ID = process.env.CALENDLY_CLIENT_ID;
const CLIENT_SECRET = process.env.CALENDLY_CLIENT_SECRET;

if (!CLIENT_ID || !CLIENT_SECRET) {
  console.error('❌ CALENDLY_CLIENT_ID and CALENDLY_CLIENT_SECRET must be set in environment variables');
  process.exit(1);
}

console.log('✅ Environment variables found');
console.log(`🌐 Staging domain: ${STAGING_DOMAIN}`);
console.log('');

// Step 1: Generate authorization URL
const redirectUri = `${STAGING_DOMAIN}/api/calendly/oauth/callback`;
const authUrl = `https://auth.calendly.com/oauth/authorize?client_id=${CLIENT_ID}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;

console.log('📋 Step 1: OAuth Configuration');
console.log('Update your Calendly Developer Portal settings:');
console.log(`Redirect URI: ${redirectUri}`);
console.log('');
console.log('📋 Step 2: Authorization');
console.log('Open this URL in your browser to authorize:');
console.log(authUrl);
console.log('');

console.log('📋 Step 3: After Authorization');
console.log('After completing the OAuth flow, you should see a success message.');
console.log('Then run the setup check:');
console.log(`curl ${STAGING_DOMAIN}/api/calendly/test`);
console.log('');

console.log('📋 Step 4: Webhook Setup');
console.log('Set this environment variable in your staging environment:');
console.log(`CALENDLY_WEBHOOK_URL=${STAGING_DOMAIN}/api/webhooks/calendly`);
console.log('');
console.log('Then run the webhook setup script with the staging domain.');
console.log('');

console.log('🎉 Setup instructions complete!');
console.log('');
console.log('💡 Next steps:');
console.log('1. Update Calendly Developer Portal redirect URI');
console.log('2. Visit the authorization URL above');
console.log('3. Test the integration');
console.log('4. Set up webhooks'); 