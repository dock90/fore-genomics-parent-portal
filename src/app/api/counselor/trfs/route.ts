import { NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";

/**
 * Get all unapproved TRFs for counselor review
 */
export async function GET() {
  try {
    if (!(await checkRole("COUNSELOR"))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get all kits with unapproved TRFs
    const unapprovedKits = await prisma.kit.findMany({
      where: {
        trfApproved: false,
        trfFileName: { not: null },
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
        consent: true,
        questionnaire: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json({ kits: unapprovedKits });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch unapproved TRFs" },
      { status: 500 }
    );
  }
}
