#!/bin/bash

# Test script for daily counselor notifications cron job
# This simulates what Vercel Cron will do

echo "Testing daily counselor notifications cron job..."

# Set the API endpoint
API_URL="http://localhost:3000/webhook/counselor-notifications"

# Optional: Set CRON_SECRET if you have one configured
# CRON_SECRET="your-secret-here"

echo "Calling API endpoint: $API_URL"

# Make the POST request
if [ -n "$CRON_SECRET" ]; then
    echo "Using CRON_SECRET for authentication"
    curl -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $CRON_SECRET" \
        -v
else
    echo "No CRON_SECRET set, making unauthenticated request"
    curl -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -v
fi

echo ""
echo "Test completed. Check the response above for success/error messages."
echo ""
echo "Expected responses:"
echo "- If there are unapproved TRFs: Will send emails to counselors"
echo "- If no unapproved TRFs: Will return success with 'No notifications sent'"
echo "- If no counselors found: Will return success with 'No counselors found'"
echo ""
echo "To test with CRON_SECRET, set it in your environment:"
echo "export CRON_SECRET=your-secret-here"
echo "Then run this script again"
