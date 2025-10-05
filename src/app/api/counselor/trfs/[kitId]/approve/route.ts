import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { googleStorageService } from "@/lib/google-storage";
import { checkRole } from "@/utils/roles";
import { trfPDFService } from "@/lib/trf-service";
import { consentPDFService } from "@/lib/consent-service";
import { combinedDocumentService } from "@/lib/combined-document-service";

/**
 * Upload approved TRF file and mark kit as approved
 */
export async function POST(
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

    // Get the kit with order information
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
      },
    });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Check if already approved
    if (kit.trfApproved) {
      return NextResponse.json({ 
        error: "TRF for this kit has already been approved." 
      }, { status: 400 });
    }

    // Get counselor user email from Clerk
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const counselorUser = await client.users.getUser(userId);
    const counselorEmail = counselorUser.emailAddresses[0]?.emailAddress;

    // Get pre-configured signature
    const signatureImage = process.env.COUNSELOR_SIGNATURE_IMAGE;
    if (!signatureImage) {
      return NextResponse.json({ 
        error: "Counselor signature not configured" 
      }, { status: 500 });
    }

    // Generate signed TRF with counselor information
    const trfData = {
      userInfo: {
        firstName: kit.order.parent?.profile?.firstName || "",
        lastName: kit.order.parent?.profile?.lastName || "",
        email: kit.order.parent?.email || "",
        phone: kit.order.parent?.profile?.phone || "",
        address: kit.order.parent?.profile?.address || "",
        addressLine2: kit.order.parent?.profile?.addressLine2 || "",
        city: kit.order.parent?.profile?.city || "",
        state: kit.order.parent?.profile?.state || "",
        zipCode: kit.order.parent?.profile?.zipCode || "",
      },
      childInfo: {
        firstName: kit.child?.firstName || "",
        lastName: kit.child?.lastName || "",
        dob: kit.child?.dob || "",
        sex: kit.child?.sex || "",
        ethnicities: kit.child?.ethnicities || [],
      },
      consentData: {
        relationshipToChild: kit.consent?.relationshipToChild || "MOTHER",
      },
      orderNumber: kit.order.orderNumber,
      kitNumber: kit.kitNumber,
      counselorSignature: {
        image: signatureImage,
        name: "Counselor",
        title: "Genetic Counselor",
        date: new Date().toISOString().split("T")[0],
      },
      orderingProvider: {
        name: "Brian K. Williams",
        address: "4900 Hopyard Ste. 100 W",
        city: "Pleasanton",
        state: "CA",
        zipCode: "94588",
        phone: "844-362-2550",
        email: "patientrecords@greygenetics.com",
        office: "AMG Medical Group",
      },
    };

    // Generate signed combined PDF
    const combinedData = {
      userInfo: trfData.userInfo,
      childInfo: trfData.childInfo,
      orderNumber: kit.order.orderNumber,
      kitNumber: kit.kitNumber,
      orderInfo: {
        orderNumber: kit.order.orderNumber,
        kitNumber: kit.kitNumber,
        orderDate: kit.order.createdAt.toISOString().split("T")[0],
      },
      consentData: {
        part1Accepted: kit.consent?.part1Accepted || false,
        part2Accepted: kit.consent?.part2Accepted || false,
        part3Accepted: kit.consent?.part3Accepted || false,
        consentAll: kit.consent?.consentAll || false,
        signature: kit.consent?.signature || null,
        signatureDate: kit.consent?.signatureDate ? kit.consent.signatureDate.toISOString().split('T')[0] : null,
        signerName: kit.consent?.signerName || null,
        relationshipToChild: kit.consent?.relationshipToChild || null,
        ipAddress: kit.consent?.ipAddress || "",
        userAgent: kit.consent?.userAgent || "",
      },
      counselorSignature: signatureImage,
      counselorSignatureDate: trfData.counselorSignature.date,
      orderingProvider: trfData.orderingProvider,
    };

    const { pdfBuffer, fileName } = await combinedDocumentService.createCombinedDocument(combinedData);

    // Upload the signed combined PDF to the dedicated approved TRF bucket
    const uploadResult = await googleStorageService.uploadApprovedTRFPDF(
      pdfBuffer,
      `approved-${fileName}`
    );

    // Update kit with approval information
    const updatedKit = await prisma.kit.update({
      where: { id: kitId },
      data: {
        trfApproved: true,
        trfApprovedAt: new Date(),
        trfApprovedBy: userId,
        trfApprovedFileName: uploadResult.fileName,
      },
    });

    // Log the approval activity
    if (counselorEmail) {
      await prisma.auditLog.create({
        data: {
          orderId: kit.orderId,
          action: "COUNSELOR_APPROVED_TRF",
          userId: userId,
          userEmail: counselorEmail,
          details: {
            kitId: kit.id,
            originalTrfFileName: kit.trfFileName,
            approvedTrfFileName: uploadResult.fileName,
            approvedAt: new Date().toISOString(),
            signatureApplied: true,
          },
        },
      });
    }

    // Notify admins about the approved TRF
    try {
      const { emailService } = await import("@/lib/email-service");
      await emailService.sendAdminTRFApprovedNotification({
        orderNumber: kit.order.orderNumber,
        kitNumber: kit.kitNumber,
        approvedAt: new Date(),
        counselorEmail: counselorEmail || undefined,
      });
    } catch (notificationError) {
      console.error("Failed to send admin TRF approved notification:", notificationError);
      // Do not fail the approval if email fails
    }

    return NextResponse.json({
      success: true,
      message: "TRF approved successfully",
      kit: {
        id: updatedKit.id,
        trfApproved: updatedKit.trfApproved,
        trfApprovedAt: updatedKit.trfApprovedAt,
        trfApprovedFileName: updatedKit.trfApprovedFileName,
      },
      uploadResult,
    });
  } catch (error) {
    console.error("Error approving TRF:", error);
    return NextResponse.json(
      { error: "Failed to approve TRF" },
      { status: 500 }
    );
  }
}
