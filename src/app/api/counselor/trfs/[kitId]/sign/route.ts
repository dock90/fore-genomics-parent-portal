import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";
import { trfPDFService } from "@/lib/trf-service";
import { consentPDFService } from "@/lib/consent-service";
import { PDFDocument } from "pdf-lib";

/**
 * Generate signed TRF and consent PDFs for counselor approval
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
    const body = await request.json();
    const { counselorName, counselorTitle, signatureDate } = body;

    // Validate required fields
    if (!counselorName || !counselorTitle) {
      return NextResponse.json(
        {
          error: "Missing required fields: counselorName, counselorTitle",
        },
        { status: 400 }
      );
    }

    // Use pre-configured signature image (base64 encoded)
    // This should be stored securely in environment variables or a secure storage
    const signatureImage = process.env.COUNSELOR_SIGNATURE_IMAGE || "";
    if (!signatureImage) {
      return NextResponse.json(
        {
          error: "Counselor signature not configured",
        },
        { status: 500 }
      );
    }

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

    // Prepare TRF data with counselor signature
    const trfData = {
      userInfo: {
        firstName: kit.order.parent?.profile?.firstName || "",
        lastName: kit.order.parent?.profile?.lastName || "",
        email: kit.order.parent?.email || "",
        address: kit.order.parent?.profile?.address || "",
        addressLine2: kit.order.parent?.profile?.addressLine2 || "",
        city: kit.order.parent?.profile?.city || "",
        state: kit.order.parent?.profile?.state || "",
        zipCode: kit.order.parent?.profile?.zipCode || "",
        phone: kit.order.parent?.profile?.phone || "",
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
        name: counselorName,
        title: counselorTitle,
        date: signatureDate || new Date().toISOString().split("T")[0],
      },
    };

    // Generate signed TRF PDF
    const trfResult = await trfPDFService.generateSignedTRFPDF(trfData);

    // Prepare consent data (no changes needed for consent)
    const consentData = {
      childInfo: {
        firstName: kit.child?.firstName || "",
        lastName: kit.child?.lastName || "",
        dob: kit.child?.dob || "",
        sex: kit.child?.sex || "",
        ethnicities: kit.child?.ethnicities || [],
      },
      consentData: {
        part1Accepted: kit.consent?.part1Accepted || false,
        part2Accepted: kit.consent?.part2Accepted || false,
        part3Accepted: kit.consent?.part3Accepted || false,
        consentAll: kit.consent?.consentAll || false,
        signature: kit.consent?.signature || "",
        signatureDate: kit.consent?.signatureDate
          ? kit.consent.signatureDate.toISOString().split("T")[0]
          : "",
        signerName: kit.consent?.signerName || "",
        relationshipToChild: kit.consent?.relationshipToChild || "MOTHER",
        ipAddress: kit.consent?.ipAddress || "",
        userAgent: kit.consent?.userAgent || "",
      },
      orderNumber: kit.order.orderNumber,
      kitNumber: kit.kitNumber,
    };

    // Generate consent PDF
    const consentResult =
      await consentPDFService.generateConsentPDF(consentData);

    // Merge both PDFs into a single document
    const mergedPdf = await PDFDocument.create();

    // Add TRF pages
    const trfPdf = await PDFDocument.load(trfResult.pdfBuffer);
    const trfPages = await mergedPdf.copyPages(trfPdf, trfPdf.getPageIndices());
    trfPages.forEach((page) => mergedPdf.addPage(page));

    // Add consent pages
    const consentPdf = await PDFDocument.load(consentResult.pdfBuffer);
    const consentPages = await mergedPdf.copyPages(
      consentPdf,
      consentPdf.getPageIndices()
    );
    consentPages.forEach((page) => mergedPdf.addPage(page));

    const mergedPdfBytes = await mergedPdf.save();
    const combinedPdfBuffer = Buffer.from(mergedPdfBytes);

    // Get counselor user email from Clerk for audit logging
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const counselorUser = await client.users.getUser(userId);
    const counselorEmail = counselorUser.emailAddresses[0]?.emailAddress;

    // Log the signing activity
    if (counselorEmail) {
      await prisma.auditLog.create({
        data: {
          orderId: kit.orderId,
          action: "COUNSELOR_SIGNED_TRF",
          userId: userId,
          userEmail: counselorEmail,
          details: {
            kitId: kit.id,
            counselorName,
            counselorTitle,
            signatureDate:
              signatureDate || new Date().toISOString().split("T")[0],
            hasSignatureImage: !!signatureImage,
          },
        },
      });
    }

    return NextResponse.json({
      success: true,
      pdfBuffer: combinedPdfBuffer.toString("base64"),
      fileName: `signed-${kit.order.orderNumber}-${kit.kitNumber}-${new Date().toISOString().split("T")[0]}.pdf`,
      kit: {
        id: kit.id,
        kitNumber: kit.kitNumber,
        orderNumber: kit.order.orderNumber,
        childName: kit.child
          ? `${kit.child.firstName} ${kit.child.lastName}`
          : "N/A",
        parentName: kit.order.parent?.profile
          ? `${kit.order.parent.profile.firstName} ${kit.order.parent.profile.lastName}`
          : "N/A",
      },
    });
  } catch (error) {
    return NextResponse.json({ error: "Failed to sign TRF" }, { status: 500 });
  }
}
