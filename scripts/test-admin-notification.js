#!/usr/bin/env node

/**
 * Test script for admin notification emails
 *
 * Usage:
 * 1. Set ADMIN_NOTIFICATION_EMAILS in your .env.local file
 * 2. Run: node scripts/test-admin-notification.js
 */

require("dotenv").config({ path: ".env.local" });

async function testAdminNotification() {
  try {
    console.log("🧪 Testing Admin Notification Email...\n");

    // Check if admin emails are configured
    const adminEmails = process.env.ADMIN_NOTIFICATION_EMAILS;
    if (!adminEmails) {
      console.log("❌ ADMIN_NOTIFICATION_EMAILS not configured in .env.local");
      console.log(
        "   Please add: ADMIN_NOTIFICATION_EMAILS=your-email@example.com"
      );
      return;
    }

    console.log(`📧 Admin emails configured: ${adminEmails}\n`);

    // Import the email service
    const { emailService } = await import("../src/lib/email-service.js");

    // Test the admin notification
    const testData = {
      parentEmail: "test-parent@example.com",
      orderNumber: "TEST-ORD-123",
      completedAt: new Date(),
    };

    console.log("📤 Sending test admin notification...");
    console.log("   Test data:", testData);

    await emailService.sendAdminOnboardingNotification(testData);

    console.log("\n✅ Admin notification email sent successfully!");
    console.log(`   Check your inbox at: ${adminEmails}`);
  } catch (error) {
    console.log("\n❌ Test failed:", error.message);

    if (error.message.includes("transporter not initialized")) {
      console.log("\n💡 Make sure you have configured SMTP settings:");
      console.log("   - SMTP_USER or GMAIL_USER");
      console.log("   - SMTP_PASS or GMAIL_APP_PASSWORD");
      console.log("   - Optional: SMTP_HOST, SMTP_PORT, SMTP_SECURE");
    }

    if (error.message.includes("Cannot find module")) {
      console.log(
        "\n💡 Make sure you're running this from the project root directory"
      );
    }
  }
}

// Run the test
testAdminNotification();
