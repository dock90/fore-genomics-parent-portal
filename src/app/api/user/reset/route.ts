import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function DELETE() {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get user's email from Clerk before deleting
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
    }

    // Find user in database
    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail },
      include: {
        children: true,
        consents: true,
        questionnaires: true,
        parentOrders: true,
        purchaserOrders: true,
        profile: true,
      },
    });

    if (dbUser) {
      // Delete all related records in the correct order (due to foreign key constraints)

      // Delete orders where user is parent or purchaser
      await prisma.order.deleteMany({
        where: {
          OR: [{ parentId: dbUser.id }, { purchaserId: dbUser.id }],
        },
      });

      // Delete questionnaires
      await prisma.questionnaire.deleteMany({
        where: { userId: dbUser.id },
      });

      // Delete consents
      await prisma.consent.deleteMany({
        where: { userId: dbUser.id },
      });

      // Delete children
      await prisma.child.deleteMany({
        where: { userId: dbUser.id },
      });

      // Delete user profile
      await prisma.userProfile.deleteMany({
        where: { userId: dbUser.id },
      });

      // Delete parent invitations where this user is the parent
      await prisma.parentInvitation.deleteMany({
        where: {
          order: {
            parent: {
              email: userEmail,
            },
          },
        },
      });

      // Delete the user
      await prisma.user.delete({
        where: { id: dbUser.id },
      });
    }

    // Delete the Clerk user
    try {
      await client.users.deleteUser(userId);
    } catch (clerkError) {}

    return NextResponse.json({
      success: true,
      message: "User data deleted successfully",
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to reset user data" },
      { status: 500 }
    );
  }
}
