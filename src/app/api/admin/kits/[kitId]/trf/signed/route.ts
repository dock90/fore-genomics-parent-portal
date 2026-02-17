import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { googleStorageService } from "@/lib/google-storage";
import { checkRole } from "@/utils/roles";

// Admin endpoint to download signed TRF / Consent files
export async function GET(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  try {
    if (!checkRole("ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kitId } = params;

    const kit = await prisma.kit.findUnique({
      where: { id: kitId },
      include: {
        order: true,
      },
    });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    if (!kit.trfApprovedFileName) {
      return NextResponse.json(
        {
          error:
            "Signed TRF / Consent not available for this kit. Please upload it first.",
        },
        { status: 404 }
      );
    }

    const fileResult = await googleStorageService.getApprovedTRF(
      kit.trfApprovedFileName
    );
    if (!fileResult) {
      return NextResponse.json(
        { error: "File not found in storage. Please contact support." },
        { status: 404 }
      );
    }

    // Audit log
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const adminUser = await client.users.getUser(userId);
    const adminEmail = adminUser.emailAddresses[0]?.emailAddress;

    const { AuditService } = await import("@/lib/audit-service");
    await AuditService.logAction({
      orderId: kit.order.id,
      action: "SIGNED_TRF_CONSENT_DOWNLOAD",
      userId: userId,
      userEmail: adminEmail || "unknown",
      details: {
        kitId: kit.id,
        kitNumber: kit.kitNumber,
        orderNumber: kit.order.orderNumber,
        fileName: kit.trfApprovedFileName,
      },
    });

    return NextResponse.redirect(fileResult.fileUrl);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to download signed TRF / Consent" },
      { status: 500 }
    );
  }
}
