import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hasApprovedTRFAccess } from "@/utils/approved-trf-access";

export async function GET() {
  try {
    // Check if user has approved TRF access
    const hasAccess = await hasApprovedTRFAccess();
    if (!hasAccess) {
      return NextResponse.json(
        { error: "Unauthorized access to approved TRFs" },
        { status: 403 }
      );
    }

    // Fetch approved TRFs from database
    const approvedTRFs = await prisma.kit.findMany({
      where: {
        trfApproved: true,
        trfApprovedFileName: {
          not: null,
        },
      },
      select: {
        id: true,
        kitNumber: true,
        trfApprovedAt: true,
        trfApprovedFileName: true,
        order: {
          select: {
            orderNumber: true,
          },
        },
        child: {
          select: {
            firstName: true,
            lastName: true,
          },
        },
      },
      orderBy: {
        trfApprovedAt: "desc",
      },
    });

    // Format the data for the frontend
    const formattedTRFs = approvedTRFs.map((kit) => ({
      kitId: kit.id,
      orderNumber: kit.order.orderNumber,
      childName: kit.child
        ? `${kit.child.firstName} ${kit.child.lastName}`
        : "Unknown Child",
      approvedAt: kit.trfApprovedAt?.toISOString() || "",
      kitNumber: kit.kitNumber,
      fileName: kit.trfApprovedFileName || "Unknown File",
    }));

    return NextResponse.json({
      success: true,
      approvedTRFs: formattedTRFs,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch approved TRFs" },
      { status: 500 }
    );
  }
}
