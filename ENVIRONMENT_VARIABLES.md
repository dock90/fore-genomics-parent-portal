# Environment Variables

## Application Configuration

### `NEXT_PUBLIC_APP_URL`

The base URL of the application, used for generating links in emails and OAuth redirects.

**Values:**

- Development: `http://localhost:3000`
- Staging: `https://fore-genomics-parent-portal-env-staging-adam-lands-projects.vercel.app`
- Production: `https://your-production-domain.com`

**Usage:**

```bash
# For local development
NEXT_PUBLIC_APP_URL=http://localhost:3000

# For staging
NEXT_PUBLIC_APP_URL=https://fore-genomics-parent-portal-env-staging-adam-lands-projects.vercel.app

# For production
NEXT_PUBLIC_APP_URL=https://your-production-domain.com
```

**Features that use this variable:**

1. **Parent Invitation Emails** - Links to complete onboarding
2. **Calendly OAuth Redirects** - Callback URLs for OAuth flow
3. **Any other application links** - Ensures consistency across environments

**Security Note:** This variable is prefixed with `NEXT_PUBLIC_` so it's available in the browser. Make sure to set the correct URL for each environment.

## Cron Job Configuration

### `CRON_SECRET`

Optional secret token for securing cron job endpoints. If set, cron jobs will require this token in the Authorization header.

**Usage:**

```bash
# Generate a secure random token
CRON_SECRET=your-secure-random-token-here
```

**Security Note:** This is optional but recommended for production environments to prevent unauthorized access to cron endpoints.

## Test Mode Configuration

### `NEXT_PUBLIC_TEST_MODE`

Controls whether testing features are enabled in the application.

**Values:**

- `'true'` - Enables test features (reset buttons, [TEST] email prefixes)
- `'false'` or unset - Disables test features (production mode)

**Usage:**

```bash
# For staging/testing environments
NEXT_PUBLIC_TEST_MODE=true

# For production (or omit entirely)
NEXT_PUBLIC_TEST_MODE=false
```

**Features controlled by this variable:**

1. **Reset Buttons** - Shows "Delete All Data & Sign Out" buttons on dashboards
2. **Email Prefixes** - Adds "[TEST]" prefix to all email subjects

**Example email subjects:**

- Test mode: `[TEST] New Onboarding Completed - John Doe (ORD-123)`
- Production: `New Onboarding Completed - John Doe (ORD-123)`

**Security Note:** This variable is prefixed with `NEXT_PUBLIC_` so it's available in the browser. Only use `true` in staging/testing environments, never in production.

## Feature Flags

### `NEXT_PUBLIC_ENABLE_CALENDLY`

Controls whether the Calendly integration is enabled.

**Values:**

- `'true'` - Enables Calendly scheduling and counseling features
- `'false'` or unset - Disables Calendly features

### `NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS`

Controls whether admins can create orders with multiple test kits.

**Values:**

- `'true'` - Enables multi-kit order creation (1-10 kits per order)
- `'false'` or unset - Restricts orders to single kit only

**Usage:**

```bash
# Enable multi-kit orders
NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS=true

# Disable multi-kit orders (single kit only)
NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS=false
```

## Calendly Integration

### `CALENDLY_CLIENT_ID`

Your Calendly OAuth application client ID from the Calendly Developer Portal.

### `CALENDLY_CLIENT_SECRET`

Your Calendly OAuth application client secret from the Calendly Developer Portal.

### `CALENDLY_ACCESS_TOKEN`

Access token for Calendly API (used as fallback if OAuth tokens are not available).

### `CALENDLY_TOKEN_EXPIRES_AT`

Expiration timestamp for the access token in ISO format (used as fallback).

### `CALENDLY_WEBHOOK_SIGNING_KEY`

Signing key for verifying Calendly webhook signatures. Retrieved when setting up webhooks.

### `CALENDLY_PRE_TEST_EVENT_SLUG`

Slug of the pre-test genetic counseling event type in Calendly.

### `CALENDLY_POST_TEST_EVENT_SLUG`

Slug of the post-test genetic counseling event type in Calendly.

### `CALENDLY_WEBHOOK_URL`

URL where Calendly will send webhook notifications (e.g., `https://your-domain.com/api/webhooks/calendly`).

## Admin Notifications

### `ADMIN_NOTIFICATION_EMAILS`

Comma-separated list of admin email addresses that will receive notifications when users complete onboarding.

**Values:**
- Comma-separated email addresses (e.g., `admin@example.com,manager@example.com`)
- Leave unset to disable admin notifications

**Usage:**

```bash
# Single admin email
ADMIN_NOTIFICATION_EMAILS=admin@foregenomics.com

# Multiple admin emails
ADMIN_NOTIFICATION_EMAILS=admin@foregenomics.com,manager@foregenomics.com,ops@foregenomics.com
```

**Features that use this variable:**

1. **Onboarding Completion Notifications** - Sends email to admins when users complete onboarding
2. **Order Status Updates** - Notifies admins of new completed orders
3. **Kit Status Changes** - Alerts admins when kits are ready for processing

**Email Content:**
- Child and parent information
- Order and kit details
- Completion timestamp
- Next steps for the admin team

**Security Note:** This variable is not prefixed with `NEXT_PUBLIC_` so it's only available on the server side. Admin emails are never exposed to the client.

**Setup Instructions:**

1. Set `NEXT_PUBLIC_APP_URL` to your environment's base URL
2. Create OAuth application in Calendly Developer Portal
3. Set redirect URI to `${NEXT_PUBLIC_APP_URL}/api/calendly/oauth/callback`
4. Run `node scripts/setup-calendly-oauth.js` to get initial tokens
5. Create event types in Calendly for pre-test and post-test counseling
6. Run `node scripts/setup-calendly-webhooks.js` to configure webhooks
7. Add all environment variables to your `.env.local` file

## Approved TRF Access Control

### `APPROVED_TRF_ACCESS_EMAILS`

Comma-separated list of email addresses that are authorized to download approved TRF files. Only users with these specific email addresses can access approved TRFs, regardless of their role.

**Values:**
- Comma-separated email addresses (e.g., `user1@foregenomics.com,user2@foregenomics.com`)
- Leave unset to deny all approved TRF access

**Usage:**

```bash
# Single user access
APPROVED_TRF_ACCESS_EMAILS=geneticist@foregenomics.com

# Multiple users access
APPROVED_TRF_ACCESS_EMAILS=geneticist@foregenomics.com,lab-director@foregenomics.com
```

**Features that use this variable:**

1. **Approved TRF Downloads** - Controls access to counselor-approved TRF files
2. **TRF Approval Workflow** - Ensures only authorized personnel can access final TRFs
3. **Compliance** - Maintains strict access control for sensitive genetic data

**Security Note:** This variable is not prefixed with `NEXT_PUBLIC_` so it's only available on the server side. Email addresses are never exposed to the client.

**Access Control Logic:**
- Users must be authenticated via Clerk
- User's email must be in the `APPROVED_TRF_ACCESS_EMAILS` list
- Access is checked on every approved TRF download request
- No role-based access - only email-based whitelist

## Google Cloud Storage - Approved TRFs

### `GOOGLE_CLOUD_APPROVED_TRF_BUCKET`

Name of the Google Cloud Storage bucket where approved TRF files are stored. This bucket should have tight access controls and only be accessible by users in the `APPROVED_TRF_ACCESS_EMAILS` list.

**Values:**
- Google Cloud Storage bucket name (e.g., `fore-genomics-approved-trfs`)
- Should be different from the main TRF bucket for security isolation

**Usage:**

```bash
# Production bucket
GOOGLE_CLOUD_APPROVED_TRF_BUCKET=fore-genomics-approved-trfs

# Test/staging bucket
GOOGLE_CLOUD_APPROVED_TRF_BUCKET=fore-genomics-approved-trfs-test
```

**Features that use this variable:**

1. **Approved TRF Storage** - Secure storage for counselor-approved TRF files
2. **TRF Approval Workflow** - Upload destination for approved TRFs
3. **Access Control** - Physical separation from unapproved TRFs

**Security Note:** This bucket should have restricted access permissions and only be accessible by authorized users.
