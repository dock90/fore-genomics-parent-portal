#!/usr/bin/env bash
# =============================================================================
# test-shopify-webhook.sh
#
# Simulates a Shopify orders/paid webhook to verify the Health Hub invite flow
# end-to-end without placing a real Shopify order.
#
# PREREQUISITES:
#   1. App running locally: npm run dev
#   2. SHOPIFY_WEBHOOK_SECRET set in .env.local
#   3. openssl installed (macOS/Linux: built-in; Windows: Git Bash has it)
#
# USAGE:
#   chmod +x scripts/test-shopify-webhook.sh
#   SHOPIFY_WEBHOOK_SECRET=your_secret ./scripts/test-shopify-webhook.sh
#
#   Or with a custom email:
#   SHOPIFY_WEBHOOK_SECRET=your_secret TEST_EMAIL=parent@example.com ./scripts/test-shopify-webhook.sh
#
# WHAT THIS DOES:
#   1. Builds a realistic Shopify orders/paid JSON payload
#   2. Signs it with your SHOPIFY_WEBHOOK_SECRET using HMAC-SHA256
#   3. POSTs it to /api/webhooks/shopify
#   4. Checks the response
#
# AFTER RUNNING — verify these:
#   ✅ App logs show "Clerk invitation sent"
#   ✅ Clerk Dashboard → Users → Invitations has the test email
#   ✅ Neon DB: SELECT * FROM "User" ORDER BY "createdAt" DESC LIMIT 1;
#   ✅ Neon DB: SELECT * FROM "Order" ORDER BY "createdAt" DESC LIMIT 1;
# =============================================================================

set -e

APP_URL="${APP_URL:-http://localhost:3000}"
WEBHOOK_URL="${APP_URL}/api/webhooks/shopify"
TEST_EMAIL="${TEST_EMAIL:-test-parent-$(date +%s)@example.com}"
WEBHOOK_SECRET="${SHOPIFY_WEBHOOK_SECRET:-}"

if [ -z "$WEBHOOK_SECRET" ]; then
  echo "❌ SHOPIFY_WEBHOOK_SECRET is not set."
  echo "   Run: SHOPIFY_WEBHOOK_SECRET=your_secret ./scripts/test-shopify-webhook.sh"
  echo "   (Get the secret from Shopify Admin → Settings → Notifications → Webhooks → your endpoint)"
  exit 1
fi

echo "==> Testing Shopify invite flow"
echo "    App URL:    ${APP_URL}"
echo "    Test email: ${TEST_EMAIL}"
echo ""

# Build the payload
PAYLOAD=$(cat <<EOF
{
  "id": 9998887770001,
  "order_number": 9999,
  "email": "${TEST_EMAIL}",
  "financial_status": "paid",
  "customer": {
    "id": 8887770001,
    "email": "${TEST_EMAIL}",
    "first_name": "Test",
    "last_name": "Parent",
    "phone": "+16195550100"
  },
  "billing_address": {
    "first_name": "Test",
    "last_name": "Parent",
    "address1": "123 Test Street",
    "address2": null,
    "city": "San Diego",
    "province": "California",
    "province_code": "CA",
    "zip": "92101",
    "country": "United States",
    "phone": "+16195550100"
  },
  "line_items": [
    {
      "id": 1111,
      "title": "Fore Genomics Health Screening Kit",
      "quantity": 1,
      "sku": "KIT-BASE-001",
      "price": "499.00"
    }
  ],
  "total_price": "499.00",
  "currency": "USD",
  "created_at": "$(date -u +%Y-%m-%dT%H:%M:%SZ)"
}
EOF
)

# Generate HMAC-SHA256 signature (base64)
SIGNATURE=$(echo -n "${PAYLOAD}" | openssl dgst -sha256 -hmac "${WEBHOOK_SECRET}" -binary | base64)

echo "==> Sending signed webhook to ${WEBHOOK_URL}..."

HTTP_STATUS=$(curl -s -o /tmp/shopify-webhook-response.txt -w "%{http_code}" \
  -X POST "${WEBHOOK_URL}" \
  -H "Content-Type: application/json" \
  -H "X-Shopify-Topic: orders/paid" \
  -H "X-Shopify-Shop-Domain: foregenomics.myshopify.com" \
  -H "X-Shopify-Hmac-Sha256: ${SIGNATURE}" \
  -d "${PAYLOAD}")

RESPONSE=$(cat /tmp/shopify-webhook-response.txt)

echo ""
echo "HTTP Status: ${HTTP_STATUS}"
echo "Response:    ${RESPONSE}"
echo ""

if [ "${HTTP_STATUS}" = "200" ]; then
  echo "✅ Webhook accepted (HTTP 200)"
  echo ""
  echo "==> Next steps to verify:"
  echo "    1. Check app logs for: 'Clerk invitation sent' for ${TEST_EMAIL}"
  echo "    2. Check Clerk Dashboard → Users → Invitations"
  echo "    3. Query DB:"
  echo "       SELECT email, role, \"createdAt\" FROM \"User\" WHERE email = '${TEST_EMAIL}';"
  echo "       SELECT \"orderNumber\", status, \"createdAt\" FROM \"Order\" ORDER BY \"createdAt\" DESC LIMIT 1;"
elif [ "${HTTP_STATUS}" = "401" ]; then
  echo "❌ HMAC verification failed (401)"
  echo "   Check that SHOPIFY_WEBHOOK_SECRET matches what's in your .env.local"
else
  echo "⚠️  Unexpected status: ${HTTP_STATUS}"
  echo "   Check app logs for errors"
fi
