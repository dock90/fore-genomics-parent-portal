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
    const { childInfo, parentInfo, initiatedBy, initiatorEmail, inviterName } = body;

    // Validate required fields
    if (!parentInfo.parentName || !parentInfo.parentEmail) {
      return NextResponse.json(
        { error: "Parent name and email are required" },
        { status: 400 }
      );
    }

    // Store the invitation in the database
    const invitation = await prisma.parentInvitation.create({
      data: {
        childFirstName: childInfo.firstName,
        childLastName: childInfo.lastName,
        childDOB: new Date(childInfo.dob),
        childSex: childInfo.sex,
        childEthnicity: childInfo.ethnicity,
        parentName: parentInfo.parentName,
        parentEmail: parentInfo.parentEmail,
        initiatedBy: initiatedBy,
        initiatorEmail: initiatorEmail,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });

    // Generate a secure invitation token
    const invitationToken = crypto.randomUUID();
    
    // Update the invitation with the token
    await prisma.parentInvitation.update({
      where: { id: invitation.id },
      data: { invitationToken },
    });

    // Send invitation email to parent/guardian
    try {
      const { emailService } = await import('@/lib/email-service');
      await emailService.sendParentInvitation({
        to: parentInfo.parentEmail,
        childName: `${childInfo.firstName} ${childInfo.lastName}`,
        invitationToken,
        expiresAt: invitation.expiresAt,
        inviterName: inviterName,
      });
      
      console.log("Parent invitation email sent successfully to:", parentInfo.parentEmail);
    } catch (emailError) {
      console.error("Failed to send invitation email:", emailError);
      // Don't fail the entire request if email fails, but log it
    }
    
    console.log("Parent invitation created:", {
      invitationId: invitation.id,
      parentEmail: parentInfo.parentEmail,
      invitationToken,
    });

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      invitationId: invitation.id,
    });

  } catch (error) {
    console.error("Error creating parent invitation:", error);
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
} 