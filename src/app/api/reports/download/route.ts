import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { reportStorageService } from "@/lib/report-storage";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { kitId, fileName } = await request.json();

    if (!kitId || !fileName) {
      return NextResponse.json(
        { error: "Kit ID and file name are required" },
        { status: 400 }
      );
    }

    // Get user email from Clerk
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 404 }
      );
    }

    // Look up the kit by ID and verify the user owns it
    const kit = await prisma.kit.findFirst({
      where: {
        id: kitId,
        order: {
          parent: { email: userEmail },
        },
      },
      include: {
        order: {
          include: {
            parent: true,
          },
        },
        child: true,
      },
    });

    if (!kit) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 }
      );
    }

    // Verify the requested filename actually belongs to this kit
    const validFileNames = [
      kit.reportFileName,
      kit.parentReportFileName,
      kit.pediatricianReportFileName,
      kit.fullLabReportFileName,
    ].filter(Boolean);

    if (!validFileNames.includes(fileName)) {
      return NextResponse.json(
        { error: "Report not found or access denied" },
        { status: 404 }
      );
    }

    // Check if counseling is required before allowing download
    if (kit.order.status === "COMPLETE_COUNSELING_REQUIRED") {
      return NextResponse.json(
        {
          error:
            "Genetic counseling appointment required before report can be accessed",
        },
        { status: 403 }
      );
    }

    // Verify the kit has completed onboarding
    if (!kit.childId || !kit.consentId || !kit.questionnaireId) {
      return NextResponse.json(
        { error: "Report not available - kit onboarding incomplete" },
        { status: 403 }
      );
    }

    // Generate a signed URL for the report
    let downloadUrl: string;
    try {
      downloadUrl = await reportStorageService.getReportUrl(fileName);
    } catch (error) {
      return NextResponse.json(
        { error: "Report file not found" },
        { status: 404 }
      );
    }

    // Log the download action for audit trail
    const { AuditService } = await import("@/lib/audit-service");
    await AuditService.logAction({
      orderId: kit.order.id,
      action: "REPORT_DOWNLOAD",
      userId: userId,
      userEmail: userEmail,
      details: {
        fileName: fileName,
        downloadUrl: downloadUrl,
        orderNumber: kit.order.orderNumber,
        kitId: kit.id,
        kitNumber: kit.kitNumber,
      },
    });

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to generate download URL" },
      { status: 500 }
    );
  }
}
