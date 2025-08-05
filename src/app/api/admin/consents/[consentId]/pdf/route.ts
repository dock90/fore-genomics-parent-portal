import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";
import { consentPDFService } from "@/lib/consent-pdf-service";

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

    // Get the consent with all associated data
    const consent = await prisma.consent.findUnique({
      where: { id: consentId },
      include: {
        user: {
          include: {
            profile: true,
          },
        },
        kit: {
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
          },
        },
      },
    });

    if (!consent) {
      return NextResponse.json({ error: "Consent not found" }, { status: 404 });
    }

    if (!consent.consentFileName) {
      return NextResponse.json({ error: "No consent PDF available for this consent" }, { status: 404 });
    }

    // Generate a signed URL for the consent PDF
    try {
      const downloadUrl = await consentPDFService.getConsentPDFUrl(consent.consentFileName);
      
      // Log the download action for audit trail
      const { AuditService } = await import("@/lib/audit-service");
      await AuditService.logAction({
        orderId: consent.kit?.order.id || "",
        action: "CONSENT_PDF_DOWNLOAD",
        userId: userId,
        userEmail: consent.user.email,
        details: {
          consentId: consent.id,
          consentFileName: consent.consentFileName,
          downloadUrl: downloadUrl,
          orderNumber: consent.kit?.order.orderNumber,
          kitId: consent.kit?.id,
          kitNumber: consent.kit?.kitNumber,
        },
      });

      // Redirect to the PDF URL
      return NextResponse.redirect(downloadUrl);
    } catch (error) {
      console.error("Error generating consent PDF URL:", error);
      return NextResponse.json(
        { error: "Failed to generate consent PDF URL" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error downloading consent PDF for consent:", params.consentId, error);
    return NextResponse.json(
      { error: "Failed to download consent PDF" },
      { status: 500 }
    );
  }
} 