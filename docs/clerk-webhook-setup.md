# Clerk Webhook Setup Guide

This guide explains how to configure Clerk webhooks to sync user email changes to the database.

## Why We Need This

When a user changes their email address in Clerk (through account settings or admin action), we need to update our database to keep the records in sync. The webhook automatically handles this synchronization.

## Setup Steps

### 1. Get Your Webhook Endpoint URL

Your webhook endpoint is:
```
https://your-domain.com/api/webhooks/clerk
```

For local development with a tunnel (e.g., ngrok):
```
https://your-ngrok-subdomain.ngrok.io/api/webhooks/clerk
```

### 2. Create the Webhook in Clerk Dashboard

1. Log in to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application
3. Navigate to **Webhooks** in the left sidebar
4. Click **Add Endpoint**

### 3. Configure the Endpoint

1. **Endpoint URL**: Enter your webhook URL from Step 1
2. **Message Filtering**: Select the following events:
   - `user.updated` - Triggers when user data changes (including email)
   - `user.deleted` - Triggers when a user is deleted from Clerk

3. Click **Create**

### 4. Copy the Signing Secret

After creating the webhook:

1. Click on the newly created webhook endpoint
2. Find the **Signing Secret** section
3. Click to reveal and copy the secret (starts with `whsec_`)

### 5. Add Environment Variable

Add the signing secret to your environment:

**Local Development (`.env.local`):**
```env
CLERK_WEBHOOK_SECRET=whsec_your_signing_secret_here
```

**Production (Vercel/Hosting Provider):**
Add `CLERK_WEBHOOK_SECRET` to your environment variables in your hosting dashboard.

### 6. Deploy and Test

1. Deploy your application (or restart your dev server)
2. In Clerk Dashboard, go to your webhook endpoint
3. Click **Testing** tab
4. Send a test `user.updated` event
5. Check the **Logs** tab to verify it was received successfully

## What the Webhook Handles

### `user.updated` Event
- Detects when a user's primary email address changes
- Finds the user in our database by their `clerkId`
- Updates the email if it has changed
- Prevents duplicate emails (returns 409 if email already taken)

### `user.deleted` Event
- Clears the `clerkId` from the user record
- Preserves the user record for order history and audit trails
- User can no longer log in but their data remains intact

## Troubleshooting

### Webhook Returns 400 "Missing svix headers"
- Ensure you're using the correct endpoint URL
- Verify the request is coming from Clerk (not a manual test)

### Webhook Returns 400 "Invalid signature"
- Double-check `CLERK_WEBHOOK_SECRET` is set correctly
- Ensure there are no extra spaces or characters in the secret
- Verify you copied the secret from the correct webhook endpoint

### Webhook Returns 500 "Webhook secret not configured"
- Add `CLERK_WEBHOOK_SECRET` to your environment variables
- Restart your application after adding the variable

### Email Update Not Working
- Check the webhook logs in Clerk Dashboard for errors
- Verify the user exists in your database with the matching `clerkId`
- Check your application logs for detailed error messages

## Local Development with ngrok

To test webhooks locally:

1. Install ngrok: `npm install -g ngrok`
2. Start your dev server: `npm run dev`
3. In a new terminal: `ngrok http 3000`
4. Copy the HTTPS URL (e.g., `https://abc123.ngrok.io`)
5. Update your Clerk webhook endpoint to use this URL
6. Remember to update it back to production URL when done

## Security Notes

- The webhook verifies signatures using the `svix` library
- Never expose your `CLERK_WEBHOOK_SECRET` in client-side code
- The endpoint only accepts POST requests with valid Clerk signatures
- All webhook events are logged for debugging purposes
