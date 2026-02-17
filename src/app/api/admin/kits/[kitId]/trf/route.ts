import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { googleStorageService } from "@/lib/google-storage";
import { trfPDFService } from "@/lib/trf-service";
import { checkRole } from "@/utils/roles";

// Admin endpoint to generate a TRF for a kit that has completed onboarding
export async function POST(
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

    // Verify the kit has completed onboarding (child, consent, questionnaire)
    if (!kit.child || !kit.consent || !kit.questionnaire) {
      return NextResponse.json(
        {
          error:
            "Cannot generate TRF. Kit is missing required onboarding data (child, consent, or questionnaire).",
        },
        { status: 400 }
      );
    }

    // Resolve parent profile from the order's parent or purchaser
    const parentProfile =
      kit.order.parent?.profile || kit.order.purchaser?.profile;
    const parentEmail =
      kit.order.parent?.email || kit.order.purchaser?.email || "";

    if (!parentProfile) {
      return NextResponse.json(
        { error: "Cannot generate TRF. Parent profile data is missing." },
        { status: 400 }
      );
    }

    // Build the TRF data from the database records
    const trfData = {
      userInfo: {
        firstName: parentProfile.firstName || "",
        lastName: parentProfile.lastName || "",
        email: parentEmail,
        address: parentProfile.address || "",
        addressLine2: parentProfile.addressLine2 || "",
        city: parentProfile.city || "",
        state: parentProfile.state || "",
        zipCode: parentProfile.zipCode || "",
        phone: parentProfile.phone || "",
      },
      childInfo: {
        firstName: kit.child.firstName || "",
        lastName: kit.child.lastName || "",
        dob: kit.child.dob || "",
        sex: kit.child.sex || "",
        ethnicities: kit.child.ethnicities || [],
      },
      consentData: {
        relationshipToChild: kit.consent.relationshipToChild || "MOTHER",
      },
      orderNumber: kit.order.orderNumber,
      kitNumber: kit.kitNumber,
    };

    // Generate the TRF PDF
    const trfResult = await trfPDFService.generateTRFPDF(trfData);

    // Upload to Google Cloud Storage
    const uploadResult = await googleStorageService.uploadTRFPDF(
      trfResult.pdfBuffer,
      trfResult.fileName
    );

    // Save the TRF filename on the kit record
    await prisma.kit.update({
      where: { id: kitId },
      data: { trfFileName: uploadResult.fileName },
    });

    // Audit log
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const adminUser = await client.users.getUser(userId);
    const adminEmail = adminUser.emailAddresses[0]?.emailAddress;

    const { AuditService } = await import("@/lib/audit-service");
    await AuditService.logAction({
      orderId: kit.order.id,
      action: "TRF_CREATION",
      userId: userId,
      userEmail: adminEmail || "unknown",
      details: {
        kitId: kit.id,
        kitNumber: kit.kitNumber,
        orderNumber: kit.order.orderNumber,
        trfFileName: uploadResult.fileName,
        trfUrl: uploadResult.fileUrl,
        context: "admin_generate",
      },
    });

    return NextResponse.json({
      success: true,
      trfFileName: uploadResult.fileName,
    });
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `Failed to generate TRF: ${error.message}`
            : "Failed to generate TRF",
      },
      { status: 500 }
    );
  }
}

// Admin endpoint to download existing TRF files
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
      return NextResponse.json(
        {
          error:
            "TRF not available for this kit. Please complete onboarding first.",
        },
        { status: 404 }
      );
    }

    // Get the existing TRF file
    const trfResult = await googleStorageService.getOnboardingRecord(
      kit.trfFileName
    );
    if (!trfResult) {
      return NextResponse.json(
        { error: "TRF file not found in storage. Please contact support." },
        { status: 404 }
      );
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
    return NextResponse.json(
      { error: "Failed to download TRF" },
      { status: 500 }
    );
  }
}
