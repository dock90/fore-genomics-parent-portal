import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { consentPDFService } from "@/lib/consent-service";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";

export async function GET(
  request: NextRequest,
  { params }: { params: { consentId: string } }
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

    const { consentId } = params;

    // Fetch consent data from database
    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        child: true,
        kit: {
          include: {
            order: true,
          },
        },
      },
    });

    if (!consent) {
      return NextResponse.json({ error: "Consent not found" }, { status: 404 });
    }

    // Check if required data exists
    if (!consent.user.profile || !consent.child || !consent.kit?.order) {
      return NextResponse.json(
        { error: "Missing required consent data" },
        { status: 400 }
      );
    }

    // Prepare data for PDF generation
    const pdfData = {
      userInfo: {
        firstName: consent.user.profile.firstName,
        lastName: consent.user.profile.lastName,
        email: consent.user.email,
        address: consent.user.profile.address,
        city: consent.user.profile.city,
        state: consent.user.profile.state,
        zipCode: consent.user.profile.zipCode,
        phone: consent.user.profile.phone,
      },
      childInfo: {
        firstName: consent.child.firstName || "",
        lastName: consent.child.lastName || "",
        dob: consent.child.dob || "",
        sex: consent.child.sex || "",
        ethnicities: consent.child.ethnicities || [],
      },
      consentData: {
        part1Accepted: consent.part1Accepted,
        part2Accepted: consent.part2Accepted,
        part3Accepted: consent.part3Accepted,
        consentAll: consent.consentAll,
        signature: consent.signature,
        signatureDate: consent.signatureDate
          ? consent.signatureDate.toISOString().split("T")[0]
          : null,
        signerName: consent.signerName,
        relationshipToChild: consent.relationshipToChild,
      },
      orderNumber: consent.kit.order.orderNumber,
      kitNumber: consent.kit.kitNumber,
    };

    // Generate PDF on-demand
    const { pdfBuffer, fileName } =
      await consentPDFService.generateConsentPDFOnDemand(pdfData);

    // Return PDF as response
    return new NextResponse(Buffer.from(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${fileName}"`,
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  } catch (error) {
    const errorMessage =
      error instanceof Error ? error.message : "Unknown error occurred";

    return NextResponse.json(
      { error: `Failed to generate PDF: ${errorMessage}` },
      { status: 500 }
    );
  }
}
