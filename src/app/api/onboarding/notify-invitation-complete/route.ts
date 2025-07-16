import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { parentEmail, childFirstName, childLastName } = body;

    // Find the invitation for this parent and child
    const invitation = await prisma.parentInvitation.findFirst({
      where: {
        parentEmail: parentEmail,
        childFirstName: childFirstName,
        childLastName: childLastName,
        status: "PENDING",
        initiatorEmail: { not: null }
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "No pending invitation found" },
        { status: 404 }
      );
    }

    // Update the invitation status to ACCEPTED and mark as notified
    await prisma.parentInvitation.update({
      where: { id: invitation.id },
      data: {
        status: "ACCEPTED",
        acceptedAt: new Date(),
        notifiedAt: new Date(),
      },
    });

    // TODO: Send email notification to initiator
    // This would integrate with your email service
    console.log("Sending notification to initiator:", {
      initiatorEmail: invitation.initiatorEmail,
      childName: `${childFirstName} ${childLastName}`,
      parentEmail: parentEmail,
    });

    // For now, we'll just log the notification
    // In production, you would send an email like:
    // await emailService.sendInvitationCompleteNotification({
    //   to: invitation.initiatorEmail,
    //   childName: `${childFirstName} ${childLastName}`,
    //   parentEmail: parentEmail,
    // });

    return NextResponse.json({
      success: true,
      message: "Notification sent successfully",
    });

  } catch (error) {
    console.error("Error sending invitation completion notification:", error);
    return NextResponse.json(
      { error: "Failed to send notification" },
      { status: 500 }
    );
  }
} 