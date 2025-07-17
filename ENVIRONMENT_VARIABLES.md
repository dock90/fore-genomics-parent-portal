# Environment Variables

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

**Setup Instructions:**
1. Create OAuth application in Calendly Developer Portal
2. Set redirect URI to `http://localhost:3000/api/calendly/oauth/callback` (for development)
3. Run `node scripts/setup-calendly-oauth.js` to get initial tokens
4. Create event types in Calendly for pre-test and post-test counseling
5. Run `node scripts/setup-calendly-webhooks.js` to configure webhooks
6. Add all environment variables to your `.env.local` file 