import { auth, clerkClient } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Mark this route as dynamic to eliminate build warnings
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    const { userId } = await auth();

    // Get orderId from query parameters if provided
    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user email from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 404 }
      );
    }

    // Get user data from database by email
    const dbUser = await prisma.user.findFirst({
      where: { email: userEmail },
      include: {
        profile: true,
        children: true,
        consents: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
        questionnaires: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Get the specific order or latest order for the user with kits and their associated children
    let order;
    if (orderId) {
      // Use the specific order if orderId is provided
      const orderWhere =
        dbUser.role === "ADMIN"
          ? { id: orderId }
          : dbUser.role === "PARENT"
            ? { id: orderId, parentId: dbUser.id }
            : { id: orderId, purchaserId: dbUser.id };

      order = await prisma.order.findFirst({
        where: orderWhere,
        include: {
          kits: {
            include: {
              child: true,
            },
          },
        },
      });
    } else {
      // Fall back to latest order if no specific orderId provided
      const orderWhere =
        dbUser.role === "ADMIN"
          ? {}
          : dbUser.role === "PARENT"
            ? { parentId: dbUser.id }
            : { purchaserId: dbUser.id };

      order = await prisma.order.findFirst({
        where: orderWhere,
        include: {
          kits: {
            include: {
              child: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
      });
    }

    return NextResponse.json({
      user: dbUser,
      order: order,
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
