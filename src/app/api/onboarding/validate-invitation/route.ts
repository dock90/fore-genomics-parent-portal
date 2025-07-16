import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { token } = body;

    if (!token) {
      return NextResponse.json(
        { error: "Token is required" },
        { status: 400 }
      );
    }

    // Find the invitation by token
    const invitation = await prisma.parentInvitation.findFirst({
      where: {
        invitationToken: token,
        status: "PENDING",
        expiresAt: {
          gt: new Date(), // Not expired
        },
      },
    });

    if (!invitation) {
      return NextResponse.json(
        { error: "Invalid or expired invitation token" },
        { status: 404 }
      );
    }

    // Return the invitation data (without sensitive fields)
    return NextResponse.json({
      success: true,
      invitation: {
        id: invitation.id,
        childFirstName: invitation.childFirstName,
        childLastName: invitation.childLastName,
        childDOB: invitation.childDOB,
        childSex: invitation.childSex,
        childEthnicity: invitation.childEthnicity,
        parentEmail: invitation.parentEmail,
        expiresAt: invitation.expiresAt,
        createdAt: invitation.createdAt,
      },
    });

  } catch (error) {
    console.error("Error validating invitation:", error);
    return NextResponse.json(
      { error: "Failed to validate invitation" },
      { status: 500 }
    );
  }
} 