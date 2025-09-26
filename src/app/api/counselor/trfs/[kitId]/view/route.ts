import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { trfPDFService } from "@/lib/trf-service";
import { consentPDFService } from "@/lib/consent-service";
import { checkRole } from "@/utils/roles";

/**
 * Get TRF and consent HTML for counselor review
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

    // Prepare TRF data
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
    };

    // Prepare consent data
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
        signatureDate: kit.consent?.signatureDate ? kit.consent.signatureDate.toISOString().split('T')[0] : "",
        signerName: kit.consent?.signerName || "",
        relationshipToChild: kit.consent?.relationshipToChild || "MOTHER",
        ipAddress: kit.consent?.ipAddress || "",
        userAgent: kit.consent?.userAgent || "",
      },
      orderNumber: kit.order.orderNumber,
      kitNumber: kit.kitNumber,
    };

    // Generate HTML content for both documents
    const trfHTML = trfPDFService.generateTRFHTML(trfData);
    const consentHTML = consentPDFService.generateConsentHTML(consentData);

    // Get counselor user email from Clerk for audit logging
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const counselorUser = await client.users.getUser(userId);
    const counselorEmail = counselorUser.emailAddresses[0]?.emailAddress;

    // Log the view activity
    if (counselorEmail) {
      await prisma.auditLog.create({
        data: {
          orderId: kit.orderId,
          action: "COUNSELOR_VIEWED_TRF",
          userId: userId,
          userEmail: counselorEmail,
          details: {
            kitId: kit.id,
            trfFileName: kit.trfFileName,
            viewReason: "counselor_review",
          },
        },
      });
    }

    return NextResponse.json({
      trfHTML,
      consentHTML,
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
    console.error("Error getting TRF/consent HTML for counselor:", error);
    return NextResponse.json(
      { error: "Failed to get TRF/consent HTML" },
      { status: 500 }
    );
  }
}
