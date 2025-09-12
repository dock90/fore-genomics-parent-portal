import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { googleStorageService } from "@/lib/google-storage";
import { checkRole } from "@/utils/roles";

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
        order: true,
      },
    });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Check if TRF already exists for this kit
    if (!kit.trfFileName) {
      return NextResponse.json({ 
        error: "No original TRF found for this kit. Cannot approve." 
      }, { status: 400 });
    }

    // Check if already approved
    if (kit.trfApproved) {
      return NextResponse.json({ 
        error: "TRF for this kit has already been approved." 
      }, { status: 400 });
    }

    // Parse form data
    const formData = await request.formData();
    const approvedTRFFile = formData.get("approvedTRF") as File;

    if (!approvedTRFFile) {
      return NextResponse.json({ 
        error: "Approved TRF file is required" 
      }, { status: 400 });
    }

    // Validate file type
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
    ];
    
    if (!allowedTypes.includes(approvedTRFFile.type)) {
      return NextResponse.json({ 
        error: "Invalid file type. Please upload an Excel file (.xlsx or .xls)." 
      }, { status: 400 });
    }

    // Get counselor user email from Clerk
    const { clerkClient } = await import("@clerk/nextjs/server");
    const client = await clerkClient();
    const counselorUser = await client.users.getUser(userId);
    const counselorEmail = counselorUser.emailAddresses[0]?.emailAddress;

    // Upload approved TRF to Google Cloud Storage
    const uploadResult = await googleStorageService.uploadApprovedTRF(
      kit.order.orderNumber,
      kit.kitNumber,
      approvedTRFFile,
      counselorEmail || userId
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
          },
        },
      });
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
