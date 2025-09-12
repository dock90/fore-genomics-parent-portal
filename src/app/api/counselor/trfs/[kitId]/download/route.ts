import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { googleStorageService } from "@/lib/google-storage";
import { checkRole } from "@/utils/roles";

/**
 * Download existing (unapproved) TRF file for counselor review
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  try {
    // Check if user is counselor
    if (!checkRole("COUNSELOR")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kitId } = params;

    // Get the kit with all associated data
    const kit = await prisma.kit.findUnique({
      where: { id: kitId },
      include: {
        order: {
          include: {
            parent: {
              include: {
                profile: true,
              },
            },
            purchaser: {
              include: {
                profile: true,
              },
            },
          },
        },
        child: true,
        consent: true,
        questionnaire: true,
      },
    });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Check if TRF exists for this kit
    if (!kit.trfFileName) {
      return NextResponse.json({ 
        error: "TRF not available for this kit. Please complete onboarding first." 
      }, { status: 404 });
    }

    // Get the existing TRF file
    const trfResult = await googleStorageService.getOnboardingRecord(kit.trfFileName);
    if (!trfResult) {
      return NextResponse.json({ 
        error: "TRF file not found in storage. Please contact support." 
      }, { status: 404 });
    }

    // Get counselor user email from Clerk for audit logging
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const counselorUser = await client.users.getUser(userId);
    const counselorEmail = counselorUser.emailAddresses[0]?.emailAddress;

    // Log the download activity
    if (counselorEmail) {
      await prisma.auditLog.create({
        data: {
          orderId: kit.orderId,
          action: "COUNSELOR_DOWNLOADED_TRF",
          userId: userId,
          userEmail: counselorEmail,
          details: {
            kitId: kit.id,
            trfFileName: kit.trfFileName,
            downloadReason: "counselor_review",
          },
        },
      });
    }

    return NextResponse.json({
      fileUrl: trfResult.fileUrl,
      fileName: trfResult.fileName,
      kit: {
        id: kit.id,
        kitNumber: kit.kitNumber,
        orderNumber: kit.order.orderNumber,
        childName: kit.child ? `${kit.child.firstName} ${kit.child.lastName}` : "N/A",
        parentName: kit.order.parent?.profile ? 
          `${kit.order.parent.profile.firstName} ${kit.order.parent.profile.lastName}` : "N/A",
      },
    });
  } catch (error) {
    console.error("Error downloading TRF for counselor:", error);
    return NextResponse.json(
      { error: "Failed to download TRF" },
      { status: 500 }
    );
  }
}
