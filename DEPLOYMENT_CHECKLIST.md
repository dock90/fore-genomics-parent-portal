# Production Deployment Checklist for Vercel

## Phase 1: Pre-Deployment Setup ✅

### 1.1 Database Setup
- [ ] Set up production PostgreSQL database
  - [ ] Vercel Postgres (recommended for Vercel deployment)
  - [ ] Or external provider (Supabase, PlanetScale, etc.)
- [ ] Configure connection pooling
- [ ] Set up database backups
- [ ] Test database connectivity

### 1.2 Environment Variables
- [ ] Set up all required environment variables in Vercel dashboard:
  - [ ] `DATABASE_URL` - Production database connection string
  - [ ] `NEXT_PUBLIC_APP_URL` - Production domain URL
  - [ ] `NEXT_PUBLIC_TEST_MODE` - Set to `false` for production
  - [ ] `NEXT_PUBLIC_ENABLE_CALENDLY` - Feature flag for Calendly
  - [ ] `NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS` - Feature flag for multi-kit orders
  - [ ] Clerk authentication variables
  - [ ] Google Cloud Storage credentials
  - [ ] Email service configuration
  - [ ] Calendly integration variables (if enabled)

### 1.3 External Services Configuration
- [ ] Configure Clerk authentication for production domain
- [ ] Set up Google Cloud Storage bucket and permissions
- [ ] Configure email service (SMTP or SendGrid)
- [ ] Set up Calendly integration (if needed)
- [ ] Configure webhook endpoints for production

## Phase 2: Code Preparation

### 2.1 Build Optimization ✅
- [x] Test build process locally
- [ ] Fix ESLint warnings (optional but recommended)
- [ ] Fix dynamic server usage warnings
- [ ] Optimize bundle size

### 2.2 Database Migrations
- [ ] Prepare production database migrations
- [ ] Test migration process
- [ ] Create migration rollback plan

### 2.3 Security Review
- [ ] Review environment variable security
- [ ] Ensure no sensitive data in client-side code
- [ ] Configure CORS settings
- [ ] Set up rate limiting

## Phase 3: Deployment

### 3.1 Initial Deployment
- [ ] Merge staging branch to main (triggers automatic deployment)
- [ ] Configure custom domain in Vercel dashboard
- [ ] Set up SSL certificates (automatic with Vercel)
- [ ] Configure redirects if needed

### 3.2 Post-Deployment
- [x] Database migrations run automatically during build
- [ ] Seed initial data if needed
- [ ] Test all functionality
- [ ] Monitor error logs
- [ ] Set up monitoring and alerts

## Phase 4: Production Configuration

### 4.1 Performance Optimization
- [ ] Configure CDN settings
- [ ] Set up caching strategies
- [ ] Optimize images and assets
- [ ] Configure edge functions if needed

### 4.2 Monitoring and Analytics
- [ ] Set up error tracking (Sentry, etc.)
- [ ] Configure analytics
- [ ] Set up uptime monitoring
- [ ] Configure log aggregation

### 4.3 Backup and Recovery
- [ ] Set up automated database backups
- [ ] Test recovery procedures
- [ ] Document disaster recovery plan

## Current Status

### ✅ Completed
- [x] Local build test successful
- [x] Basic Vercel configuration exists

### ⚠️ Issues to Address
- [ ] Dynamic server usage warnings in API routes
- [ ] ESLint warnings (console statements, unused variables)
- [ ] Metadata viewport configuration warnings
- [ ] Calendly integration disabled (expected in test mode)

### 🔄 Next Steps
1. Set up production database (Vercel Postgres recommended)
2. Configure environment variables in Vercel dashboard
3. Merge staging branch to main (triggers deployment with automatic migrations)
4. Test production functionality

## Environment Variables Template

```bash
# Database
DATABASE_URL="postgresql://..."

# Application
NEXT_PUBLIC_APP_URL="https://your-production-domain.com"
NEXT_PUBLIC_TEST_MODE="false"
NEXT_PUBLIC_ENABLE_CALENDLY="true"
NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS="true"

# Clerk Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY="pk_..."
CLERK_SECRET_KEY="sk_..."

# Google Cloud Storage
GOOGLE_CLOUD_PROJECT_ID="your-project-id"
GOOGLE_CLOUD_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n..."
GOOGLE_CLOUD_CLIENT_EMAIL="your-service-account@your-project.iam.gserviceaccount.com"

# Email Service
SMTP_HOST="smtp.gmail.com"
SMTP_PORT="587"
SMTP_USER="your-email@gmail.com"
SMTP_PASS="your-app-password"

# Calendly (if enabled)
CALENDLY_CLIENT_ID="your-client-id"
CALENDLY_CLIENT_SECRET="your-client-secret"
CALENDLY_ACCESS_TOKEN="your-access-token"
CALENDLY_WEBHOOK_SIGNING_KEY="your-webhook-signing-key"
CALENDLY_PRE_TEST_EVENT_SLUG="your-pre-test-event-slug"
CALENDLY_POST_TEST_EVENT_SLUG="your-post-test-event-slug"
``` 