#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('🚀 Staging Deployment Helper Script');
console.log('=====================================\n');

// Check if we're on staging branch
const currentBranch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
if (currentBranch !== 'staging') {
  console.log(`❌ You're currently on branch: ${currentBranch}`);
  console.log('Please switch to staging branch first:');
  console.log('  git checkout staging');
  process.exit(1);
}

// Check for uncommitted changes
const status = execSync('git status --porcelain', { encoding: 'utf8' });
if (status.trim()) {
  console.log('❌ You have uncommitted changes. Please commit or stash them first.');
  console.log('\nUncommitted files:');
  console.log(status);
  process.exit(1);
}

console.log('✅ Branch and status checks passed\n');

// Step 1: Deploy to staging
console.log('📦 Step 1: Deploying to staging...');
try {
  execSync('git push origin staging', { stdio: 'inherit' });
  console.log('✅ Code pushed to staging branch\n');
} catch (error) {
  console.log('❌ Failed to push to staging');
  process.exit(1);
}

// Step 2: Check environment variables
console.log('🔧 Step 2: Environment Variable Checklist');
console.log('Please verify these are set in your Vercel staging project:\n');

const requiredEnvVars = [
  'CALENDLY_CLIENT_ID',
  'CALENDLY_CLIENT_SECRET',
  'CALENDLY_ACCESS_TOKEN',
  'CALENDLY_TOKEN_EXPIRES_AT',
  'CALENDLY_PRE_TEST_EVENT_SLUG',
  'CALENDLY_POST_TEST_EVENT_SLUG',
  'CALENDLY_WEBHOOK_URL',
  'CALENDLY_WEBHOOK_SIGNING_KEY',
  'DATABASE_URL',
  'NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY',
  'CLERK_SECRET_KEY'
];

requiredEnvVars.forEach(envVar => {
  console.log(`  ☐ ${envVar}`);
});

console.log('\n📋 Next Steps:');
console.log('1. Wait for Vercel deployment to complete');
console.log('2. Update Calendly app redirect URI to staging domain');
console.log('3. Run OAuth setup for staging:');
console.log('   export $(cat .env.staging | xargs)');
console.log('   node scripts/setup-calendly-oauth.js');
console.log('4. Set up webhooks for staging:');
console.log('   node scripts/setup-calendly-webhooks.js');
console.log('5. Test the integration on staging domain');
console.log('\n📖 See STAGING_DEPLOYMENT.md for detailed instructions');

// Check if .env.staging exists
const envStagingPath = path.join(process.cwd(), '.env.staging');
if (!fs.existsSync(envStagingPath)) {
  console.log('\n⚠️  .env.staging file not found');
  console.log('Create it with: cp .env.local .env.staging');
  console.log('Then update it with staging-specific values');
}

console.log('\n🎉 Deployment helper completed!'); 