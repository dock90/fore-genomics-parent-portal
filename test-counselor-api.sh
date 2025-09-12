#!/bin/bash

# COUNSELOR Feature API Testing Script
# Run this script to test the API endpoints locally

BASE_URL="http://localhost:3000"
COUNSELOR_EMAIL="counselor@test.com"
APPROVED_USER_EMAIL="test-user1@foregenomics.com"

echo "🧪 Testing COUNSELOR Feature API Endpoints"
echo "=========================================="

# Test 1: Check if counselor routes are protected (should redirect unauthenticated users)
echo "1. Testing counselor route protection..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/counselor")
if [ "$response" = "307" ] || [ "$response" = "302" ] || [ "$response" = "401" ]; then
    echo "✅ Counselor routes are protected (HTTP $response - redirects unauthenticated users)"
else
    echo "❌ Counselor routes not properly protected (HTTP $response)"
fi

# Test 2: Test daily notifications endpoint
echo "2. Testing daily notifications endpoint..."
response=$(curl -s -X POST "$BASE_URL/api/public/cron/daily-counselor-notifications" \
    -H "Authorization: Bearer test-cron-secret-123" \
    -H "Content-Type: application/json")
echo "Response: $response"

# Test 3: Test approved TRF access endpoint (should fail without auth)
echo "3. Testing approved TRF access without authentication..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/trfs/test-kit-id/approved")
if [ "$response" = "401" ]; then
    echo "✅ Approved TRF endpoint requires authentication (HTTP $response)"
else
    echo "❌ Approved TRF endpoint not properly protected (HTTP $response)"
fi

# Test 4: Test counselor TRF listing endpoint (should fail without auth)
echo "4. Testing counselor TRF listing without authentication..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/counselor/trfs")
if [ "$response" = "401" ]; then
    echo "✅ Counselor TRF endpoint requires authentication (HTTP $response)"
else
    echo "❌ Counselor TRF endpoint not properly protected (HTTP $response)"
fi

# Test 5: Test counselor TRF download endpoint (should fail without auth)
echo "5. Testing counselor TRF download without authentication..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/counselor/trfs/test-kit-id/download")
if [ "$response" = "401" ]; then
    echo "✅ Counselor TRF download endpoint requires authentication (HTTP $response)"
else
    echo "❌ Counselor TRF download endpoint not properly protected (HTTP $response)"
fi

# Test 6: Test counselor TRF approval endpoint (should fail without auth)
echo "6. Testing counselor TRF approval without authentication..."
response=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/api/counselor/trfs/test-kit-id/approve")
if [ "$response" = "401" ]; then
    echo "✅ Counselor TRF approval endpoint requires authentication (HTTP $response)"
else
    echo "❌ Counselor TRF approval endpoint not properly protected (HTTP $response)"
fi

echo ""
echo "📋 Manual Testing Required:"
echo "1. Create counselor user via admin interface"
echo "2. Login as counselor and test dashboard"
echo "3. Create test order and complete onboarding"
echo "4. Test TRF download and approval workflow"
echo "5. Test approved TRF download with whitelisted user"
echo "6. Test daily notification emails"

echo ""
echo "🔧 Environment Variables to Set:"
echo "APPROVED_TRF_ACCESS_EMAILS=$APPROVED_USER_EMAIL"
echo "GOOGLE_CLOUD_APPROVED_TRF_BUCKET=fore-genomics-approved-trfs-test"
echo "CRON_SECRET=test-cron-secret-123"

echo ""
echo "✅ Basic API protection tests completed!"
echo ""
echo "📝 Note: HTTP 307/302 responses are expected for unauthenticated users"
echo "   - These indicate proper redirect behavior"
echo "   - The middleware redirects to home page for unauthorized access"
