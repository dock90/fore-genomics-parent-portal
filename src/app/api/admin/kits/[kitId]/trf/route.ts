import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { googleStorageService } from "@/lib/google-storage";
import { combinedDocumentService } from "@/lib/combined-document-service";
import { checkRole } from "@/utils/roles";

// Admin endpoint to generate a combined TRF + Consent document for a kit
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
            "Cannot generate document. Kit is missing required onboarding data (child, consent, or questionnaire).",
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
        {
          error:
            "Cannot generate document. Parent profile data is missing.",
        },
        { status: 400 }
      );
    }

    // Build combined document data from the database records
    const combinedData = {
      kitId: kit.id,
      orderNumber: kit.order.orderNumber,
      kitNumber: kit.kitNumber,
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
        part1Accepted: kit.consent.part1Accepted,
        part2Accepted: kit.consent.part2Accepted,
        part3Accepted: kit.consent.part3Accepted,
        consentAll: kit.consent.consentAll,
        signature: kit.consent.signature,
        signatureDate: kit.consent.signatureDate
          ? kit.consent.signatureDate.toISOString().split("T")[0]
          : null,
        signerName: kit.consent.signerName,
        relationshipToChild: kit.consent.relationshipToChild,
        ipAddress: kit.consent.ipAddress || "",
        userAgent: kit.consent.userAgent || "",
      },
      orderingProvider: {
        name: process.env.ORDERING_PROVIDER_NAME || "Brian K. Williams",
        address: process.env.ORDERING_PROVIDER_ADDRESS || "4900 Hopyard Ste. 100 W",
        city: process.env.ORDERING_PROVIDER_CITY || "Pleasanton",
        state: process.env.ORDERING_PROVIDER_STATE || "CA",
        zipCode: process.env.ORDERING_PROVIDER_ZIP || "94588",
        phone: process.env.ORDERING_PROVIDER_PHONE || "844-362-2550",
        email: process.env.ORDERING_PROVIDER_EMAIL || "patientrecords@greygenetics.com",
        office: process.env.ORDERING_PROVIDER_OFFICE || "AMG Medical Group",
        npi: process.env.ORDERING_PROVIDER_NPI || "",
      },
    };

    // Generate the combined TRF + Consent PDF
    const combinedResult =
      await combinedDocumentService.createCombinedDocument(combinedData);

    // Upload to Google Cloud Storage
    const uploadResult = await googleStorageService.uploadTRFPDF(
      combinedResult.pdfBuffer,
      combinedResult.fileName
    );

    // Save the filename on the kit record
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
      action: "TRF_CONSENT_GENERATION",
      userId: userId,
      userEmail: adminEmail || "unknown",
      details: {
        kitId: kit.id,
        kitNumber: kit.kitNumber,
        orderNumber: kit.order.orderNumber,
        fileName: uploadResult.fileName,
        fileUrl: uploadResult.fileUrl,
        context: "admin_generate_combined",
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
            ? `Failed to generate TRF / Consent: ${error.message}`
            : "Failed to generate TRF / Consent",
      },
      { status: 500 }
    );
  }
}

// Admin endpoint to download existing TRF / Consent files
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

    if (!kit.trfFileName) {
      return NextResponse.json(
        {
          error:
            "TRF / Consent not available for this kit. Please generate it first.",
        },
        { status: 404 }
      );
    }

    const trfResult = await googleStorageService.getOnboardingRecord(
      kit.trfFileName
    );
    if (!trfResult) {
      return NextResponse.json(
        { error: "File not found in storage. Please contact support." },
        { status: 404 }
      );
    }

    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const adminUser = await client.users.getUser(userId);
    const adminEmail = adminUser.emailAddresses[0]?.emailAddress;

    const { AuditService } = await import("@/lib/audit-service");
    await AuditService.logAction({
      orderId: kit.order.id,
      action: "TRF_CONSENT_DOWNLOAD",
      userId: userId,
      userEmail: adminEmail || "unknown",
      details: {
        kitId: kit.id,
        kitNumber: kit.kitNumber,
        orderNumber: kit.order.orderNumber,
        fileName: trfResult.fileName,
        fileUrl: trfResult.fileUrl,
      },
    });

    return NextResponse.redirect(trfResult.fileUrl);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to download TRF / Consent" },
      { status: 500 }
    );
  }
}
