import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCounselorNotificationEmail } from "@/lib/counselor-notifications";

/**
 * Daily cron job to notify counselors about unapproved TRFs
 * This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
 * This endpoint uses a simple webhook approach without authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Simple security check - verify the request is from a legitimate source
    const userAgent = request.headers.get("user-agent");
    const cronSecret = process.env.CRON_SECRET;
    
    // Optional: Check for a simple token in the request body or headers
    const authHeader = request.headers.get("authorization");
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    console.log("Daily counselor notification cron job started");

    // Check for unapproved TRFs
    const unapprovedCount = await prisma.kit.count({
      where: {
        trfApproved: false,
        trfFileName: { not: null },
      },
    });

    console.log(`Found ${unapprovedCount} unapproved TRFs`);

    if (unapprovedCount === 0) {
      return NextResponse.json({
        success: true,
        message: "No unapproved TRFs found. No notifications sent.",
        unapprovedCount: 0,
      });
    }

    // Get all counselor users
    const counselors = await prisma.user.findMany({
      where: { role: "COUNSELOR" },
      include: { profile: true },
    });

    console.log(`Found ${counselors.length} counselors`);

    if (counselors.length === 0) {
      return NextResponse.json({
        success: true,
        message: "No counselors found. No notifications sent.",
        unapprovedCount,
        counselorsNotified: 0,
      });
    }

    // Send notification to each counselor
    const notificationPromises = counselors.map(async (counselor) => {
      try {
        await sendCounselorNotificationEmail(counselor.email, unapprovedCount);
        console.log(`Notification sent to ${counselor.email}`);
        return { email: counselor.email, success: true };
      } catch (error) {
        console.error(`Failed to send notification to ${counselor.email}:`, error);
        return { email: counselor.email, success: false, error: error.message };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

    // Log the notification activity (skip audit log for system actions to avoid foreign key constraint)
    console.log(`Daily counselor notifications completed: ${successful} successful, ${failed.length} failed`);
    console.log(`Audit log: System notification sent to ${successful} counselors, ${failed.length} failed`);

    return NextResponse.json({
      success: true,
      message: `Daily counselor notifications sent successfully`,
      unapprovedCount,
      counselorsNotified: successful,
      counselorsFailed: failed.length,
      failedEmails: failed.map(f => f.email),
    });
  } catch (error) {
    console.error("Error sending daily counselor notifications:", error);
    return NextResponse.json(
      { error: "Failed to send daily counselor notifications" },
      { status: 500 }
    );
  }
}
