import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/user-service";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const dbUser = await getDbUser(userId);

    if (!dbUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await request.json();
    const { invitationId } = body;

    if (!invitationId) {
      return NextResponse.json(
        { error: "Invitation ID is required" },
        { status: 400 }
      );
    }

    // Get the invitation
    const invitation = await prisma.parentInvitation.findUnique({
      where: { id: invitationId },
      include: {
        order: {
          include: {
            parent: {
              include: {
                profile: true,
              },
            },
            kits: {
              include: {
                child: true,
              },
            },
          },
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invitation not found" },
        { status: 404 }
      );
    }

    // Check if user has access to this invitation (must be the purchaser of the order)
    if (invitation.order.purchaserId !== dbUser.id) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    // Check if invitation is still pending
    if (invitation.status !== "PENDING") {
      return NextResponse.json(
        { error: "Invitation is not pending" },
        { status: 400 }
      );
    }

    // Check if invitation has expired
    if (invitation.expiresAt < new Date()) {
      return NextResponse.json(
        { error: "Invitation has expired" },
        { status: 400 }
      );
    }

    // Resend the invitation email
    try {
      const { emailService } = await import("@/lib/email-service");

      const child = invitation.order.kits[0]?.child;
      const childName = child
        ? `${child.firstName} ${child.lastName}`
        : "the child";

      await emailService.sendParentInvitation({
        to: invitation.order.parent?.email || "",
        childName: childName,
        inviterName: "The purchaser", // We don't have the purchaser's name here
      });

      // Update the invitation to extend the expiration date
      await prisma.parentInvitation.update({
        where: { id: invitationId },
        data: {
          expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
          updatedAt: new Date(),
        },
      });

      return NextResponse.json({
        success: true,
        message: "Invitation resent successfully",
      });
    } catch (emailError) {
      return NextResponse.json(
        { error: "Failed to send invitation email" },
        { status: 500 }
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json(
      { error: "Failed to resend invitation" },
      { status: 500 }
    );
  }
}
