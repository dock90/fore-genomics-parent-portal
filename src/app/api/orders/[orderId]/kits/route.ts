import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/user-service";
import { KitService } from "@/lib/kit-service";

export async function GET(
  request: NextRequest,
  { params }: { params: { orderId: string } }
) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await getDbUser(userId);

    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Ownership check: being signed in is NOT sufficient. getKitsForOrder returns
    // the child (with their user + profile), consent and questionnaire records, so
    // without this any authenticated user could enumerate orderIds and read another
    // family's data. Mirrors the check in ../invitations/route.ts.
    const order = await prisma.order.findFirst({
      where: {
        id: params.orderId,
        OR: [{ purchaserId: user.id }, { parentId: user.id }],
      },
    });

    if (!order) {
      return NextResponse.json(
        { error: "Order not found or access denied" },
        { status: 404 }
      );
    }

    const kits = await KitService.getKitsForOrder(params.orderId);
    return NextResponse.json(kits);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch kits" },
      { status: 500 }
    );
  }
}
