#!/usr/bin/env bash
# =============================================================================
# test-stripe-webhook.sh
#
# Simulates a Stripe checkout.session.completed webhook to verify the invite
# flow end-to-end without placing a real order.
#
# PREREQUISITES:
#   1. Stripe CLI installed: https://stripe.com/docs/stripe-cli
#   2. App running locally: npm run dev
#   3. .env.local has STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET set
#
# USAGE:
#   chmod +x scripts/test-stripe-webhook.sh
#   ./scripts/test-stripe-webhook.sh
#
# WHAT THIS DOES:
#   - Uses `stripe trigger` to fire a real checkout.session.completed event
#     signed with your webhook secret, delivered to your local app
#   - The app's /api/webhooks/stripe handler will process it
#   - A new User + Order will be created in the DB
#   - A Clerk invitation will be sent to the customer_email in the event
#
# AFTER RUNNING:
#   - Check Vercel/local logs for: "Clerk invitation sent"
#   - Check your Neon DB: SELECT * FROM "User" ORDER BY "createdAt" DESC LIMIT 1;
#   - Check Clerk Dashboard → Users → Invitations for the email below
# =============================================================================

set -e

APP_URL="${APP_URL:-http://localhost:3000}"
WEBHOOK_URL="${APP_URL}/api/webhooks/stripe"

echo "==> Testing Stripe invite flow"
echo "    App URL:     ${APP_URL}"
echo "    Webhook URL: ${WEBHOOK_URL}"
echo ""

# Option 1: Use Stripe CLI (recommended — generates a correctly signed event)
if command -v stripe &> /dev/null; then
  echo "==> Stripe CLI detected. Forwarding webhook to local app..."
  echo "    This will send a real signed checkout.session.completed event."
  echo ""
  echo "    NOTE: The test event uses Stripe's default test customer email."
  echo "    Override STRIPE_TEST_EMAIL env var to use a specific address."
  echo ""

  # Forward webhook events to local app
  # Use --forward-to to send directly, or stripe trigger for a one-shot event
  stripe trigger checkout.session.completed \
    --add checkout_session:customer_email="${STRIPE_TEST_EMAIL:-test-invite@example.com}" \
    --override checkout_session:customer_details.name="Test Parent" \
    --override checkout_session:payment_status=paid \
    2>&1 | tee /tmp/stripe-trigger-output.txt

  # Check if the webhook was received
  if grep -q "200" /tmp/stripe-trigger-output.txt 2>/dev/null; then
    echo ""
    echo "✅ Webhook delivered successfully (HTTP 200)"
    echo "   Check your app logs for 'Clerk invitation sent'"
  else
    echo ""
    echo "⚠️  Check the output above. If you see a 400, verify STRIPE_WEBHOOK_SECRET is set."
  fi

else
  # Option 2: Manual curl (no HMAC — only works if you temporarily disable signature verification)
  echo "==> Stripe CLI not found. Falling back to unsigned curl test."
  echo "    ⚠️  This will FAIL signature verification unless you disable it."
  echo "    Install Stripe CLI for proper end-to-end testing."
  echo ""
  echo "    Alternatively, use the Stripe Dashboard:"
  echo "    1. Go to Dashboard → Developers → Webhooks → your endpoint"
  echo "    2. Click 'Send test event'"
  echo "    3. Select checkout.session.completed"
  echo ""

  # Unsigned test payload — HMAC check will reject this unless disabled
  PAYLOAD='{
    "type": "checkout.session.completed",
    "data": {
      "object": {
        "id": "cs_test_local123",
        "object": "checkout.session",
        "payment_status": "paid",
        "customer_email": "'"${STRIPE_TEST_EMAIL:-test-invite@example.com}"'",
        "customer_details": {
          "email": "'"${STRIPE_TEST_EMAIL:-test-invite@example.com}"'",
          "name": "Test Parent",
          "address": {
            "line1": "123 Test St",
            "city": "San Diego",
            "state": "CA",
            "postal_code": "92101",
            "country": "US"
          }
        },
        "amount_total": 49900,
        "currency": "usd"
      }
    }
  }'

  echo "Sending test payload to ${WEBHOOK_URL}..."
  curl -s -o /dev/null -w "%{http_code}" \
    -X POST "${WEBHOOK_URL}" \
    -H "Content-Type: application/json" \
    -d "${PAYLOAD}"
  echo ""
  echo "(Expected: 400 — Stripe signature missing. Use Stripe CLI for real test.)"
fi

echo ""
echo "==> To verify results:"
echo "    1. Check app logs for: 'Clerk invitation sent'"
echo "    2. Check Clerk Dashboard → Users → Invitations"
echo "    3. Run: psql \$DATABASE_URL -c 'SELECT email, role, \"createdAt\" FROM \"User\" ORDER BY \"createdAt\" DESC LIMIT 3;'"
echo ""
