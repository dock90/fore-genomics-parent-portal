# Calendly Feature Flag

The Calendly integration is controlled by a feature flag to allow easy enabling/disabling of the functionality.

## How to Enable/Disable Calendly

### To Disable Calendly (Current State)

Add this to your `.env.local` file:

```bash
NEXT_PUBLIC_ENABLE_CALENDLY=false
```

### To Enable Calendly

Add this to your `.env.local` file:

```bash
NEXT_PUBLIC_ENABLE_CALENDLY=true
```

## What Gets Hidden When Disabled

When `NEXT_PUBLIC_ENABLE_CALENDLY=false`:

1. **Counseling Prompt Cards** - The orange and blue cards that prompt users to schedule counseling sessions
2. **Counseling Status Display** - The counseling information shown in the parent information card
3. **Calendly Modal** - Shows a "Service Temporarily Unavailable" message instead of the scheduling form
4. **API Endpoints** - Return 503 errors with a disabled message

## What Still Works When Disabled

- All other dashboard functionality
- Order management
- Kit information
- Report downloads
- User profile management

## Re-enabling Calendly

When you're ready to re-enable Calendly:

1. Set `NEXT_PUBLIC_ENABLE_CALENDLY=true` in your `.env.local`
2. Ensure you have valid Calendly credentials:
   - `CALENDLY_CLIENT_ID`
   - `CALENDLY_CLIENT_SECRET`
3. Set up OAuth authentication (run `npm run setup-calendly-oauth`)
4. Set up webhooks (run `npm run setup-calendly-webhooks`)

## Environment Variables

```bash
# Feature flag (required)
NEXT_PUBLIC_ENABLE_CALENDLY=false

# Calendly credentials (required when enabled)
CALENDLY_CLIENT_ID=your_client_id
CALENDLY_CLIENT_SECRET=your_client_secret

# Webhook configuration (required when enabled)
CALENDLY_WEBHOOK_URL=https://your-domain.com/api/webhooks/calendly
CALENDLY_WEBHOOK_SIGNING_KEY=your_signing_key

# Event type slugs (optional)
CALENDLY_PRE_TEST_EVENT_SLUG=pre-test-counseling
CALENDLY_POST_TEST_EVENT_SLUG=post-test-counseling
```

## Testing

To test the disabled state:

1. Set `NEXT_PUBLIC_ENABLE_CALENDLY=false`
2. Restart your development server
3. Navigate to the dashboard
4. Verify that counseling prompts are hidden
5. Try to open the Calendly modal - should show "Service Temporarily Unavailable"

To test the enabled state:

1. Set `NEXT_PUBLIC_ENABLE_CALENDLY=true`
2. Ensure all Calendly credentials are configured
3. Restart your development server
4. Verify that counseling prompts appear
5. Test the scheduling functionality
