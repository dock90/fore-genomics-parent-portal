import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendCounselorNotificationEmail } from "@/lib/counselor-notifications";

/**
 * Daily cron job to notify counselors about unapproved TRFs
 * This endpoint should be called by a cron service (e.g., Vercel Cron, GitHub Actions, etc.)
 * This is a public endpoint that bypasses Clerk authentication
 */
export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request (optional security check)
    const authHeader = request.headers.get("authorization");
    const cronSecret = process.env.CRON_SECRET;
    
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check for unapproved TRFs
    const unapprovedCount = await prisma.kit.count({
      where: {
        trfApproved: false,
        trfFileName: { not: null },
      },
    });

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
        return { email: counselor.email, success: true };
      } catch (error) {
        console.error(`Failed to send notification to ${counselor.email}:`, error);
        return { email: counselor.email, success: false, error: error instanceof Error ? error.message : 'Unknown error' };
      }
    });

    const results = await Promise.all(notificationPromises);
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success);

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
