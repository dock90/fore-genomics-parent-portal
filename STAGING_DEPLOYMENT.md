# Staging Deployment Guide - Calendly Integration

This guide covers deploying the Calendly integration to your staging environment.

## Prerequisites

- Vercel account with staging project configured
- Calendly account with developer access
- Database access for staging environment

## Step 1: Deploy Code to Staging

1. **Push your changes to staging branch:**
   ```bash
   git push origin staging
   ```

2. **Verify deployment in Vercel dashboard**
   - Check that the build succeeds
   - Note your staging domain (e.g., `https://fore-genomics-staging.vercel.app`)

## Step 2: Configure Calendly App for Staging

1. **Update Calendly App Settings:**
   - Go to [Calendly Developer Portal](https://developer.calendly.com/)
   - Find your "Fore Genomics Parent Portal" app
   - Update the **Redirect URI** to your staging domain:
     ```
     https://your-staging-domain.vercel.app/api/calendly/oauth/callback
     ```

2. **Note your credentials:**
   - Client ID
   - Client Secret

## Step 3: Set Up Staging Environment Variables

Add these environment variables in your Vercel staging project:

### Step 3a: Extract Google Cloud Credentials

If you're using Google Cloud Storage, extract the credentials from your service account file:

```bash
node scripts/extract-service-account-env.js
```

This will output the environment variables you need to add to Vercel.

### Required Environment Variables

```bash
# Calendly API Credentials
CALENDLY_CLIENT_ID=your_client_id_here
CALENDLY_CLIENT_SECRET=your_client_secret_here

# Calendly Event Type Slugs (update with your actual slugs)
CALENDLY_PRE_TEST_EVENT_SLUG=pre-test-counseling
CALENDLY_POST_TEST_EVENT_SLUG=post-test-counseling

# Webhook URL (update with your staging domain)
CALENDLY_WEBHOOK_URL=https://your-staging-domain.vercel.app/api/webhooks/calendly

# Database URL (your staging database)
DATABASE_URL=your_staging_database_url

# Clerk Configuration (staging)
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_staging_clerk_key
CLERK_SECRET_KEY=your_staging_clerk_secret

# Other existing environment variables...
```

### Optional Environment Variables (if using other services)

```bash
# Google Cloud Storage (if using for document storage)
GOOGLE_CLOUD_PROJECT_ID=your_project_id
GOOGLE_CLOUD_PRIVATE_KEY_ID=your_private_key_id
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_CLOUD_CLIENT_EMAIL=your_service_account@your_project.iam.gserviceaccount.com
GOOGLE_CLOUD_CLIENT_ID=your_client_id
GOOGLE_CLOUD_CLIENT_X509_CERT_URL=https://www.googleapis.com/robot/v1/metadata/x509/your_service_account%40your_project.iam.gserviceaccount.com
GOOGLE_CLOUD_STORAGE_BUCKET=fore-genomics-onboarding

# Email Service (if using for notifications)
EMAIL_SERVICE_API_KEY=your_email_service_key
```

## Step 4: Get Calendly Access Token for Staging

1. **Set up local environment for staging:**
   ```bash
   # Create .env.staging file
   cp .env.local .env.staging
   ```

2. **Update .env.staging with staging values:**
   ```bash
   CALENDLY_CLIENT_ID=your_staging_client_id
   CALENDLY_CLIENT_SECRET=your_staging_client_secret
   CALENDLY_WEBHOOK_URL=https://your-staging-domain.vercel.app/api/webhooks/calendly
   ```

3. **Run OAuth setup for staging:**
   ```bash
   # Temporarily use staging env
   export $(cat .env.staging | xargs)
   node scripts/setup-calendly-oauth.js
   ```

4. **Copy the access token to Vercel:**
   - Copy the `CALENDLY_ACCESS_TOKEN` value from the script output
   - Add it to your Vercel staging environment variables
   - Also add `CALENDLY_TOKEN_EXPIRES_AT` value

## Step 5: Set Up Calendly Event Types

1. **Create event types in Calendly:**
   - **Pre-Test Genetic Counseling** (slug: `pre-test-counseling`)
   - **Post-Test Genetic Counseling** (slug: `post-test-counseling`)

2. **Configure event types:**
   - Set appropriate duration (30-60 minutes)
   - Add custom questions if needed
   - Set availability and scheduling rules
   - Configure Google Meet integration

3. **Update environment variables with actual slugs:**
   ```bash
   CALENDLY_PRE_TEST_EVENT_SLUG=your-actual-pre-test-slug
   CALENDLY_POST_TEST_EVENT_SLUG=your-actual-post-test-slug
   ```

## Step 6: Set Up Webhooks for Staging

1. **Run webhook setup script:**
   ```bash
   # Make sure staging env is loaded
   export $(cat .env.staging | xargs)
   node scripts/setup-calendly-webhooks.js
   ```

2. **Copy the signing key:**
   - Copy the `CALENDLY_WEBHOOK_SIGNING_KEY` from script output
   - Add it to your Vercel staging environment variables

## Step 7: Run Database Migration

1. **Deploy database changes:**
   ```bash
   # If using Vercel with Prisma
   # The migration should run automatically during deployment
   
   # Or manually run:
   npx prisma migrate deploy
   ```

2. **Verify migration:**
   - Check that the new counseling fields are added to the User table
   - Fields: `preTestCounselingDate`, `preTestCounselingEventId`, `preTestCounselingInviteeId`, etc.

## Step 8: Test the Integration

1. **Test scheduling flow:**
   - Navigate to your staging dashboard
   - Try scheduling a pre-test counseling session
   - Verify the Calendly modal opens correctly
   - Complete the scheduling process

2. **Test webhook handling:**
   - Schedule an appointment
   - Check that the database is updated with appointment details
   - Cancel an appointment
   - Verify the database is updated accordingly

3. **Test post-test counseling:**
   - Ensure it only shows when order status is "COMPLETE_REPORT_DELIVERED"

## Step 9: Monitor and Debug

1. **Check Vercel function logs:**
   - Monitor `/api/calendly/scheduling-url` endpoint
   - Monitor `/api/webhooks/calendly` endpoint
   - Check for any errors in the logs

2. **Test webhook endpoint:**
   ```bash
   curl -X POST https://your-staging-domain.vercel.app/api/webhooks/calendly/test
   ```

## Troubleshooting Staging Issues

### Common Staging-Specific Issues

1. **"Webhook URL not accessible"**
   - Ensure your staging domain is publicly accessible
   - Check that the webhook URL is correct in Calendly
   - Verify the webhook endpoint is deployed

2. **"Access token expired"**
   - Re-run the OAuth setup script
   - Update the token in Vercel environment variables
   - Consider implementing token refresh for production

3. **"Database connection failed"**
   - Verify `DATABASE_URL` is correct for staging
   - Check that the database is accessible from Vercel
   - Ensure migrations have been applied

4. **"Clerk authentication issues"**
   - Verify Clerk keys are for staging environment
   - Check that the domain is configured in Clerk dashboard

### Environment Variable Checklist

Before deploying, verify these are set in Vercel:

- [ ] `CALENDLY_CLIENT_ID`
- [ ] `CALENDLY_CLIENT_SECRET`
- [ ] `CALENDLY_ACCESS_TOKEN`
- [ ] `CALENDLY_TOKEN_EXPIRES_AT`
- [ ] `CALENDLY_PRE_TEST_EVENT_SLUG`
- [ ] `CALENDLY_POST_TEST_EVENT_SLUG`
- [ ] `CALENDLY_WEBHOOK_URL`
- [ ] `CALENDLY_WEBHOOK_SIGNING_KEY`
- [ ] `DATABASE_URL`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`
- [ ] `CLERK_SECRET_KEY`

## Step 10: Production Preparation

Once staging is working:

1. **Document the working configuration**
2. **Plan production deployment** with similar steps
3. **Set up monitoring** for webhook failures
4. **Implement token refresh** for long-term access
5. **Set up alerts** for critical failures

## Security Notes

- Never commit environment variables to git
- Use Vercel's environment variable encryption
- Rotate access tokens regularly
- Monitor webhook security (signing key verification)
- Use HTTPS for all webhook URLs

## Support

If you encounter issues:
1. Check Vercel function logs
2. Verify all environment variables are set
3. Test webhook endpoint manually
4. Check Calendly developer portal for API errors 