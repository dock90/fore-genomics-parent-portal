import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { googleStorageService } from "@/lib/google-storage";
import { checkRole } from "@/utils/roles";

// Admin endpoint to download existing TRF files (TRFs are only created during onboarding completion)
export async function GET(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  try {
    // Check if user is admin
    if (!checkRole("ADMIN")) {
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
      return NextResponse.json({ error: "TRF not available for this kit. Please complete onboarding first." }, { status: 404 });
    }

    // Get the existing TRF file
    const trfResult = await googleStorageService.getOnboardingRecord(kit.trfFileName);
    if (!trfResult) {
      return NextResponse.json({ error: "TRF file not found in storage. Please contact support." }, { status: 404 });
    }

    // Get admin user email from Clerk for audit logging
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const adminUser = await client.users.getUser(userId);
    const adminEmail = adminUser.emailAddresses[0]?.emailAddress;

    // Log the TRF download action for audit trail
    const { AuditService } = await import("@/lib/audit-service");
    await AuditService.logAction({
      orderId: kit.order.id,
      action: "TRF_DOWNLOAD",
      userId: userId,
      userEmail: adminEmail || "unknown",
      details: {
        kitId: kit.id,
        kitNumber: kit.kitNumber,
        orderNumber: kit.order.orderNumber,
        trfFileName: trfResult.fileName,
        trfUrl: trfResult.fileUrl,
      },
    });

    // Redirect to the TRF URL
    return NextResponse.redirect(trfResult.fileUrl);
  } catch (error) {
    console.error("Error downloading TRF for kit:", params.kitId, error);
    return NextResponse.json(
      { error: "Failed to download TRF" },
      { status: 500 }
    );
  }
} 