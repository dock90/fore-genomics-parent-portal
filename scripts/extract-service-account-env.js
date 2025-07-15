#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

console.log('🔐 Google Cloud Service Account Environment Variables Extractor');
console.log('================================================================\n');

const serviceAccountPath = path.join(process.cwd(), 'service-account-key.json');

if (!fs.existsSync(serviceAccountPath)) {
  console.log('❌ service-account-key.json not found in project root');
  console.log('Please place your Google Cloud service account JSON file in the project root');
  process.exit(1);
}

try {
  const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
  
  console.log('✅ Service account file found and parsed successfully\n');
  
  console.log('📋 Environment Variables for Vercel:');
  console.log('=====================================\n');
  
  console.log(`GOOGLE_CLOUD_PROJECT_ID=${serviceAccount.project_id}`);
  console.log(`GOOGLE_CLOUD_PRIVATE_KEY_ID=${serviceAccount.private_key_id}`);
  console.log(`GOOGLE_CLOUD_PRIVATE_KEY="${serviceAccount.private_key}"`);
  console.log(`GOOGLE_CLOUD_CLIENT_EMAIL=${serviceAccount.client_email}`);
  console.log(`GOOGLE_CLOUD_CLIENT_ID=${serviceAccount.client_id}`);
  console.log(`GOOGLE_CLOUD_CLIENT_X509_CERT_URL=${serviceAccount.client_x509_cert_url}`);
  console.log(`GOOGLE_CLOUD_STORAGE_BUCKET=fore-genomics-onboarding`);
  
  console.log('\n📝 Instructions:');
  console.log('1. Copy the above environment variables');
  console.log('2. Add them to your Vercel staging/production project');
  console.log('3. Make sure to keep the quotes around the private key');
  console.log('4. The private key will be automatically formatted with newlines');
  
  console.log('\n⚠️  Security Notes:');
  console.log('- Never commit the service-account-key.json file');
  console.log('- Use Vercel\'s environment variable encryption');
  console.log('- Rotate the service account key periodically');
  
} catch (error) {
  console.log('❌ Error reading service account file:', error.message);
  process.exit(1);
} 