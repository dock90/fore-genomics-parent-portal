import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { googleStorageService } from "@/lib/google-storage";
import { checkRole } from "@/utils/roles";
import { getDbUser } from "@/lib/user-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  try {
    if (!(await checkRole("COUNSELOR"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await getDbUser(userId);
    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const { kitId } = params;

    const kit = await prisma.kit.findUnique({
      where: { id: kitId },
      include: { order: true },
    });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    if (!kit.trfApprovedFileName) {
      return NextResponse.json(
        { error: "Approved TRF not available for this kit." },
        { status: 404 }
      );
    }

    const fileResult = await googleStorageService.getApprovedTRF(
      kit.trfApprovedFileName
    );
    if (!fileResult) {
      return NextResponse.json(
        { error: "File not found in storage." },
        { status: 404 }
      );
    }

    await prisma.auditLog.create({
      data: {
        orderId: kit.orderId,
        action: "COUNSELOR_VIEWED_APPROVED_TRF",
        userId: dbUser.id,
        userEmail: dbUser.email,
        details: {
          kitId: kit.id,
          kitNumber: kit.kitNumber,
          orderNumber: kit.order.orderNumber,
          fileName: kit.trfApprovedFileName,
        },
      },
    });

    return NextResponse.json({ fileUrl: fileResult.fileUrl });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to get approved TRF" },
      { status: 500 }
    );
  }
}
