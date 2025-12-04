import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";

export async function GET(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  const { kitId } = params;

  try {
    // Check if user is admin
    if (!checkRole("ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the kit with report information
    const kit = await prisma.kit.findUnique({
      where: { id: kitId },
      select: {
        id: true,
        reportFileName: true,
        order: {
          select: {
            orderNumber: true,
          },
        },
      },
    });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    if (!kit.reportFileName) {
      return NextResponse.json(
        { error: "No report available for this kit" },
        { status: 404 }
      );
    }

    // For now, we'll return a placeholder response
    // In a real implementation, you would:
    // 1. Check if the report file exists in storage
    // 2. Generate a signed URL for the report
    // 3. Redirect to the signed URL

    // Placeholder implementation - you'll need to implement actual file storage logic
    return NextResponse.json({
      message: "Report download functionality needs to be implemented",
      kitId,
      reportFileName: kit.reportFileName,
      orderNumber: kit.order.orderNumber,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to download report" },
      { status: 500 }
    );
  }
}
