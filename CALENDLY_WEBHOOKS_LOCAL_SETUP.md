# Calendly Webhooks Local Setup Guide

This guide will help you set up Calendly webhooks to work with your local development environment using ngrok.

## Prerequisites

1. **ngrok** installed on your machine
2. **Calendly OAuth** already set up (run `npm run setup-calendly-oauth` if not done)
3. **Local development server** running on port 3000

## Step 1: Install ngrok

If you don't have ngrok installed:

```bash
# Using Homebrew (macOS)
brew install ngrok

# Or download from https://ngrok.com/download
```

## Step 2: Start your local development server

```bash
npm run dev
```

Your app should be running on `http://localhost:3000`

## Step 3: Start ngrok to expose your local server

```bash
ngrok http 3000
```

You'll see output like:

```
Session Status                online
Account                       your-account
Version                       3.x.x
Region                        United States (us)
Latency                       51ms
Web Interface                 http://127.0.0.1:4040
Forwarding                    https://abc123.ngrok.io -> http://localhost:3000
```

**Copy the HTTPS URL** (e.g., `https://abc123.ngrok.io`) - this is your public webhook URL.

## Step 4: Set the webhook URL environment variable

```bash
export CALENDLY_WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/calendly
```

Or add it to your `.env.local` file:

```
CALENDLY_WEBHOOK_URL=https://abc123.ngrok.io/api/webhooks/calendly
```

## Step 5: Run the Calendly webhook setup script

```bash
npm run setup-calendly-webhooks
```

This will:

- Use your Calendly OAuth token to authenticate
- Create webhooks for `invitee.created` and `invitee.canceled` events
- Point them to your ngrok URL
- Provide you with a signing key

## Step 6: Add the signing key to your environment

The setup script will output a signing key. Add it to your `.env.local`:

```
CALENDLY_WEBHOOK_SIGNING_KEY=your_signing_key_here
```

## Step 7: Test the webhook

You can test if your webhook endpoint is accessible:

```bash
curl https://abc123.ngrok.io/api/webhooks/calendly/test
```

You should see:

```json
{
  "message": "Webhook test endpoint is working",
  "timestamp": "2024-01-01T12:00:00.000Z"
}
```

## Step 8: Monitor webhook events

Keep your terminal with ngrok running and watch for webhook events. You can also view the ngrok web interface at `http://127.0.0.1:4040` to see all HTTP requests.

## Troubleshooting

### Webhook not receiving events

1. Check that ngrok is running and the URL is correct
2. Verify the webhook URL in Calendly dashboard
3. Check your server logs for any errors
4. Ensure the signing key is correct

### Signature verification failing

1. Make sure `CALENDLY_WEBHOOK_SIGNING_KEY` is set correctly
2. Check that the webhook URL matches exactly
3. Verify the webhook is created with the correct organization scope

### OAuth token issues

1. Run `npm run setup-calendly-oauth` to refresh your token
2. Check that the token hasn't expired
3. Verify your Calendly app credentials

## Development Workflow

1. **Start development**: `npm run dev`
2. **Start ngrok**: `ngrok http 3000`
3. **Update webhook URL**: Set `CALENDLY_WEBHOOK_URL` to new ngrok URL
4. **Test webhooks**: Create/cancel appointments in Calendly
5. **Monitor logs**: Watch your server console for webhook events

## Production Deployment

When deploying to production:

1. Update the webhook URL to your production domain
2. Run the setup script again with the production URL
3. Update the signing key in your production environment variables

## Useful Commands

```bash
# Setup OAuth (if needed)
npm run setup-calendly-oauth

# Setup webhooks
npm run setup-calendly-webhooks

# List existing webhooks
npm run list-calendly-webhooks

# Test webhook endpoint
curl https://your-ngrok-url.ngrok.io/api/webhooks/calendly/test
```

## Environment Variables Needed

```bash
# Required for webhook setup
CALENDLY_WEBHOOK_URL=https://your-ngrok-url.ngrok.io/api/webhooks/calendly

# Required for webhook verification
CALENDLY_WEBHOOK_SIGNING_KEY=your_signing_key_from_setup

# Required for OAuth (if not already set up)
CALENDLY_CLIENT_ID=your_client_id
CALENDLY_CLIENT_SECRET=your_client_secret
```
