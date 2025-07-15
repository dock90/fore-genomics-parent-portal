# Calendly Integration Setup (New API)

This guide will help you set up Calendly integration using the new Calendly API with OAuth2 authentication.

## Prerequisites

1. A Calendly account
2. Access to Calendly Developer Portal
3. Node.js and npm installed

## Step 1: Create Calendly App

1. Go to [Calendly Developer Portal](https://developer.calendly.com/)
2. Sign in with your Calendly account
3. Click "Create App"
4. Fill in the app details:
   - **App Name**: Fore Genomics Parent Portal
   - **Description**: Genetic counseling scheduling for Fore Genomics
   - **Redirect URI**: `http://localhost:3000/api/calendly/oauth/callback`
5. Save the app

## Step 2: Get API Credentials

After creating the app, you'll get:
- **Client ID**
- **Client Secret**

## Step 3: Configure Environment Variables

Add these to your `.env.local` file:

```bash
# Calendly API Credentials
CALENDLY_CLIENT_ID=your_client_id_here
CALENDLY_CLIENT_SECRET=your_client_secret_here

# Calendly Event Type Slugs (update these to match your actual event types)
CALENDLY_PRE_TEST_EVENT_SLUG=pre-test-counseling
CALENDLY_POST_TEST_EVENT_SLUG=post-test-counseling

# Access Token (will be obtained in next step)
CALENDLY_ACCESS_TOKEN=
CALENDLY_TOKEN_EXPIRES_AT=

# Webhook URL (update for your domain)
CALENDLY_WEBHOOK_URL=https://your-domain.com/api/webhooks/calendly

# Webhook Signing Key (will be obtained in webhook setup step)
CALENDLY_WEBHOOK_SIGNING_KEY=
```

## Step 4: Get Access Token

Run the OAuth setup script to get your access token:

```bash
node scripts/setup-calendly-oauth.js
```

This script will:
1. Open a browser window for authorization
2. Start a local server to receive the callback
3. Exchange the authorization code for an access token
4. Display the token and expiration time

Copy the displayed values to your `.env.local` file.

## Step 5: Create Event Types

1. In your Calendly account, create two event types:
   - **Pre-Test Genetic Counseling** (slug: `pre-test-counseling`)
   - **Post-Test Genetic Counseling** (slug: `post-test-counseling`)

2. Configure each event type:
   - Set appropriate duration (e.g., 30-60 minutes)
   - Add custom questions if needed
   - Set availability and scheduling rules

3. Update the environment variables with your actual event type slugs:
   ```bash
   CALENDLY_PRE_TEST_EVENT_SLUG=your-actual-pre-test-slug
   CALENDLY_POST_TEST_EVENT_SLUG=your-actual-post-test-slug
   ```

## Step 6: Set Up Webhooks via API

**Important**: Webhooks are now configured via API, not through the developer portal.

1. **Update your webhook URL** in `.env.local`:
   ```bash
   # For local development (using ngrok)
   CALENDLY_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/webhooks/calendly
   
   # For production
   CALENDLY_WEBHOOK_URL=https://yourdomain.com/api/webhooks/calendly
   ```

2. **Run the webhook setup script**:
   ```bash
   node scripts/setup-calendly-webhooks.js
   ```

   This script will:
   - List existing webhooks
   - Create a new webhook for your URL
   - Display the signing key

3. **Copy the signing key** to your `.env.local`:
   ```bash
   CALENDLY_WEBHOOK_SIGNING_KEY=the_signing_key_from_script
   ```

### Webhook Script Commands

The webhook script supports several commands:

```bash
# Create webhook (default)
node scripts/setup-calendly-webhooks.js

# List existing webhooks
node scripts/setup-calendly-webhooks.js list

# Delete a specific webhook
node scripts/setup-calendly-webhooks.js delete <webhook_uri>
```

## Step 7: Test the Integration

1. Start your development server:
   ```bash
   npm run dev
   ```

2. Navigate to the dashboard and try scheduling a counseling session

3. Check the console logs for any errors

## Step 8: Production Deployment

For production, you'll need to:

1. **Update Redirect URI**: Change the redirect URI in your Calendly app to your production domain
2. **Secure Token Storage**: Store the access token securely in your database instead of environment variables
3. **Token Refresh**: Implement token refresh logic for long-term access
4. **Webhook URL**: Update the webhook URL to your production domain and recreate the webhook

## Troubleshooting

### Common Issues

1. **"No valid Calendly access token found"**
   - Run the OAuth setup script again
   - Check that `CALENDLY_ACCESS_TOKEN` and `CALENDLY_TOKEN_EXPIRES_AT` are set correctly

2. **"Event type not found"**
   - Verify your event type slugs match exactly
   - Check that the event types are active in Calendly

3. **"Webhook signature verification fails"**
   - Ensure `CALENDLY_WEBHOOK_SIGNING_KEY` is set correctly
   - Check that the webhook URL is accessible

4. **"Failed to get scheduling URL"**
   - Verify your access token is valid and not expired
   - Check that your event types exist and are active

5. **"Webhook creation failed"**
   - Ensure your access token has the necessary permissions
   - Check that the webhook URL is publicly accessible
   - Verify the webhook URL format is correct

### Local Development with Webhooks

For local development, you'll need to expose your local server:

1. **Install ngrok**:
   ```bash
   npm install -g ngrok
   ```

2. **Start ngrok**:
   ```bash
   ngrok http 3000
   ```

3. **Update webhook URL** with the ngrok URL:
   ```bash
   CALENDLY_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/webhooks/calendly
   ```

4. **Recreate the webhook**:
   ```bash
   node scripts/setup-calendly-webhooks.js
   ```

### Token Refresh

Access tokens expire after a certain time. For production use, implement token refresh:

1. Store the refresh token securely
2. Implement automatic token refresh before expiration
3. Update the stored access token when refreshed

## API Reference

The integration uses these Calendly API endpoints:

- `GET /event_types` - List available event types
- `GET /event_types/{uri}` - Get specific event type details
- `POST /invitees` - Create new invitee
- `POST /invitees/{uri}/cancellation` - Cancel invitee
- `POST /webhook_subscriptions` - Create webhook subscription
- `GET /webhook_subscriptions` - List webhook subscriptions
- `DELETE /webhook_subscriptions/{uri}` - Delete webhook subscription

For more details, see the [Calendly API Documentation](https://developer.calendly.com/api-docs/). 