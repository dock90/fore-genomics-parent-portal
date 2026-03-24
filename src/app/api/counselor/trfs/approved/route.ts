import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";

export async function GET() {
  try {
    if (!(await checkRole("COUNSELOR"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const approvedKits = await prisma.kit.findMany({
      where: {
        trfApproved: true,
        trfApprovedFileName: { not: null },
      },
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
      orderBy: {
        trfApprovedAt: "desc",
      },
    });

    return NextResponse.json({ kits: approvedKits });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch approved TRFs" },
      { status: 500 }
    );
  }
}
