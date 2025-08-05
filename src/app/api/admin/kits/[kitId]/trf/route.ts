import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { googleStorageService } from "@/lib/google-storage";
import { checkRole } from "@/utils/roles";

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

    // Prepare the data for TRF creation
    const onboardingData = {
      userInfo: {
        firstName: kit.order.purchaser.profile?.firstName || "",
        lastName: kit.order.purchaser.profile?.lastName || "",
        email: kit.order.purchaser.email,
        address: kit.order.purchaser.profile?.address || "",
        city: kit.order.purchaser.profile?.city || "",
        state: kit.order.purchaser.profile?.state || "",
        zipCode: kit.order.purchaser.profile?.zipCode || "",
        phone: kit.order.purchaser.profile?.phone || "",
      },
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
        signature: kit.consent?.signature || null,
        signatureDate: kit.consent?.signatureDate?.toISOString() || null,
        signerName: kit.consent?.signerName || null,
        relationshipToChild: kit.consent?.relationshipToChild || null,
        childName: kit.consent?.childName || null,
        childDOB: kit.consent?.childDOB || null,
      },
      questionnaire: {
        question1: kit.questionnaire?.question1 || false,
        question1Details: kit.questionnaire?.question1Details || null,
        question2: kit.questionnaire?.question2 || false,
        question2Details: kit.questionnaire?.question2Details || null,
        question3: kit.questionnaire?.question3 || false,
        question3Details: kit.questionnaire?.question3Details || null,
      },
      orderNumber: kit.order.orderNumber,
      kitNumber: kit.kitNumber,
      ipAddress: kit.consent?.ipAddress || "",
      userAgent: kit.consent?.userAgent || "",
    };

    // Create the TRF
    const trfResult = await googleStorageService.createOnboardingRecord(onboardingData);

    // Redirect to the TRF URL
    return NextResponse.redirect(trfResult.fileUrl);
  } catch (error) {
    console.error("Error generating TRF for kit:", kitId, error);
    return NextResponse.json(
      { error: "Failed to generate TRF" },
      { status: 500 }
    );
  }
} 