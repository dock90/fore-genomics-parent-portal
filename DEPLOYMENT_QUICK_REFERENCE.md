# Deployment Quick Reference

## 🚀 Staging Deployment

### 1. Deploy Code
```bash
# Commit your changes first
git add .
git commit -m "feat: integrate Calendly for genetic counseling appointments"

# Use the deployment helper
node scripts/deploy-to-staging.js
```

### 2. Environment Variables (Vercel Staging)

**Required:**
```bash
CALENDLY_CLIENT_ID=your_client_id
CALENDLY_CLIENT_SECRET=your_client_secret
CALENDLY_ACCESS_TOKEN=your_access_token
CALENDLY_TOKEN_EXPIRES_AT=your_expiry_time
CALENDLY_PRE_TEST_EVENT_SLUG=pre-test-counseling
CALENDLY_POST_TEST_EVENT_SLUG=post-test-counseling
CALENDLY_WEBHOOK_URL=https://your-staging-domain.vercel.app/api/webhooks/calendly
CALENDLY_WEBHOOK_SIGNING_KEY=your_signing_key
DATABASE_URL=your_staging_db_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_staging_clerk_key
CLERK_SECRET_KEY=your_staging_clerk_secret
```

### 3. Calendly Setup

**Update App Redirect URI:**
```
https://your-staging-domain.vercel.app/api/calendly/oauth/callback
```

**Get Access Token:**
```bash
# Create staging env file
cp .env.local .env.staging
# Edit .env.staging with staging values
export $(cat .env.staging | xargs)
node scripts/setup-calendly-oauth.js
```

**Set Up Webhooks:**
```bash
export $(cat .env.staging | xargs)
node scripts/setup-calendly-webhooks.js
```

### 4. Test Integration

1. Navigate to staging dashboard
2. Try scheduling pre-test counseling
3. Verify Calendly modal opens
4. Complete scheduling process
5. Check database updates
6. Test cancellation flow

## 🔧 Troubleshooting

**Common Issues:**
- **Webhook not working**: Check signing key and URL
- **Access token expired**: Re-run OAuth setup
- **Database errors**: Verify DATABASE_URL and migrations
- **Clerk issues**: Check domain configuration

**Debug Commands:**
```bash
# Test webhook endpoint
curl -X POST https://your-staging-domain.vercel.app/api/webhooks/calendly/test

# Check Vercel logs
# Go to Vercel dashboard → Functions → View logs
```

## 📋 Pre-Deployment Checklist

- [ ] Code committed and pushed
- [ ] All environment variables set in Vercel
- [ ] Calendly app redirect URI updated
- [ ] Access token obtained and set
- [ ] Webhooks configured
- [ ] Database migration applied
- [ ] Event types created in Calendly

## 📚 Full Documentation

- **Detailed Guide**: `STAGING_DEPLOYMENT.md`
- **Calendly Setup**: `CALENDLY_SETUP.md`
- **Google Storage**: `GOOGLE_STORAGE_SETUP.md` 