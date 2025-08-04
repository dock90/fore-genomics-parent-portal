# Production Deployment Guide

## Quick Deployment Steps

### 1. Pre-Deployment Setup

1. **Set up production database**
   - Create a production PostgreSQL database (Vercel Postgres recommended)
   - Get the connection string for `DATABASE_URL`

2. **Configure environment variables in Vercel dashboard**
   - Go to your Vercel project dashboard
   - Navigate to Settings → Environment Variables
   - Add all variables from `production-env-template.txt`

3. **Configure external services**
   - Update Clerk authentication settings for production domain
   - Configure Google Cloud Storage for production
   - Set up email service (SMTP/SendGrid)
   - Configure Calendly integration (if enabled)

### 2. Deploy to Production

1. **Merge staging to main**
   ```bash
   git checkout main
   git merge staging
   git push origin main
   ```

2. **Monitor deployment**
   - Check Vercel dashboard for deployment status
   - Review build logs for any errors

### 3. Post-Deployment

1. **Database migrations run automatically**
   - Migrations are handled by the `vercel-build` script
   - No manual migration step needed

2. **Test production functionality**
   - Test user registration/login
   - Test onboarding flow
   - Test admin functionality
   - Test file uploads
   - Test email notifications

3. **Configure custom domain** (optional)
   - Add custom domain in Vercel dashboard
   - Update DNS records
   - SSL certificates are automatic

## Environment Variables Checklist

Make sure these are set in Vercel dashboard:

### Required
- [ ] `DATABASE_URL` - Production PostgreSQL connection string
- [ ] `NEXT_PUBLIC_APP_URL` - Your production domain
- [ ] `NEXT_PUBLIC_TEST_MODE` - Set to `"false"`
- [ ] `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` - Production Clerk key
- [ ] `CLERK_SECRET_KEY` - Production Clerk secret
- [ ] `GOOGLE_CLOUD_PROJECT_ID` - Your GCP project ID
- [ ] `GOOGLE_CLOUD_PRIVATE_KEY` - Service account private key
- [ ] `GOOGLE_CLOUD_CLIENT_EMAIL` - Service account email
- [ ] `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS` - Email configuration

### Optional (Feature Flags)
- [ ] `NEXT_PUBLIC_ENABLE_CALENDLY` - Set to `"true"` if using Calendly
- [ ] `NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS` - Set to `"true"` if enabled

### Calendly (if enabled)
- [ ] `CALENDLY_CLIENT_ID`
- [ ] `CALENDLY_CLIENT_SECRET`
- [ ] `CALENDLY_ACCESS_TOKEN`
- [ ] `CALENDLY_WEBHOOK_SIGNING_KEY`
- [ ] `CALENDLY_PRE_TEST_EVENT_SLUG`
- [ ] `CALENDLY_POST_TEST_EVENT_SLUG`

## Troubleshooting

### Common Issues

1. **Build fails**
   - Check build logs in Vercel dashboard
   - Ensure all environment variables are set
   - Verify database connectivity

2. **Database connection errors**
   - Verify `DATABASE_URL` is correct
   - Check database is accessible from Vercel
   - Ensure connection pooling is configured

3. **Authentication issues**
   - Verify Clerk keys are for production
   - Check domain is added to Clerk allowed origins
   - Ensure redirect URLs are correct

4. **File upload issues**
   - Verify Google Cloud Storage credentials
   - Check bucket permissions
   - Ensure service account has proper roles

### Monitoring

- Set up Vercel Analytics for performance monitoring
- Configure error tracking (Sentry recommended)
- Set up uptime monitoring
- Monitor database performance

## Rollback Plan

If deployment fails:

1. **Immediate rollback**
   - Revert the merge in Git
   - Push to trigger new deployment

2. **Database rollback**
   - Use Prisma migrations to rollback if needed
   - Restore from backup if necessary

3. **Environment variables**
   - Check Vercel dashboard for correct values
   - Verify no typos in variable names 