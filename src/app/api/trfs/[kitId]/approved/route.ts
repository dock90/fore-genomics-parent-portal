import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { googleStorageService } from "@/lib/google-storage";
import { hasApprovedTRFAccess } from "@/utils/approved-trf-access";

/**
 * Download approved TRF file for a specific kit.
 * Only users with emails in APPROVED_TRF_ACCESS_EMAILS can access this endpoint.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check approved TRF access
    if (!(await hasApprovedTRFAccess())) {
      return NextResponse.json({ 
        error: "Access denied. You are not authorized to download approved TRF files." 
      }, { status: 403 });
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

    // Check if approved TRF exists for this kit
    if (!kit.trfApprovedFileName) {
      return NextResponse.json({ 
        error: "No approved TRF available for this kit. Please contact a counselor to approve the TRF first." 
      }, { status: 404 });
    }

    // Get the approved TRF file from Google Cloud Storage
    const trfResult = await googleStorageService.getApprovedTRF(kit.trfApprovedFileName);
    if (!trfResult) {
      return NextResponse.json({ 
        error: "Approved TRF file not found in storage. Please contact support." 
      }, { status: 404 });
    }

    // Get user email for audit logging
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;

    // Log the download activity
    if (userEmail) {
      await prisma.auditLog.create({
        data: {
          orderId: kit.orderId,
          action: "APPROVED_TRF_DOWNLOADED",
          userId: userId,
          userEmail: userEmail,
          details: {
            kitId: kit.id,
            approvedTrfFileName: kit.trfApprovedFileName,
            approvedAt: kit.trfApprovedAt,
            approvedBy: kit.trfApprovedBy,
            downloadReason: "authorized_access",
          },
        },
      });
    }

    // Fetch the actual file content from the signed URL
    const fileResponse = await fetch(trfResult.fileUrl);
    if (!fileResponse.ok) {
      return NextResponse.json({ 
        error: "Failed to fetch file from storage" 
      }, { status: 500 });
    }

    const fileBuffer = await fileResponse.arrayBuffer();
    
    // Determine content type based on file extension
    const fileName = kit.trfApprovedFileName || "approved-trf.xlsx";
    const contentType = fileName.endsWith('.xlsx') ? 
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' :
      fileName.endsWith('.xls') ? 
      'application/vnd.ms-excel' :
      'application/octet-stream';

    // Return the file with proper headers
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
        'Content-Length': fileBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("Error downloading approved TRF:", error);
    return NextResponse.json(
      { error: "Failed to download approved TRF" },
      { status: 500 }
    );
  }
}
