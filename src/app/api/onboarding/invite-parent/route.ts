import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { childInfo, parentInfo, orderId, initiatedBy, initiatorEmail, inviterName } = body;

    // Get current user's email and database ID
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
    
    // Find the user in our database
    const dbUser = await prisma.user.findUnique({
      where: { email: userEmail }
    });

    // Validate required fields
    if (!parentInfo?.parentName || !parentInfo?.parentEmail) {
      return NextResponse.json(
        { error: "Parent name and email are required" },
        { status: 400 }
      );
    }

    // Validate orderId is provided
    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 }
      );
    }

    // Find the specified order and verify it belongs to the current user
    const orderExists = await prisma.order.findUnique({
      where: { id: orderId }
    });
    
    if (!orderExists) {
      return NextResponse.json(
        { error: "Order not found" },
        { status: 400 }
      );
    }
    
    if (orderExists.userId !== dbUser?.id) {
      return NextResponse.json(
        { error: "Order does not belong to current user" },
        { status: 400 }
      );
    }
    
    const currentUserOrder = orderExists;

    // Check if user with this email already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: parentInfo.parentEmail }
    });

    let newUser;
    if (existingUser) {
      newUser = existingUser;
    } else {
      // Create new user in database with basic profile
      newUser = await prisma.user.create({
        data: {
          email: parentInfo.parentEmail,
          role: 'PARENT',
          profile: {
            create: {
              firstName: parentInfo.parentName.split(' ')[0] || parentInfo.parentName,
              lastName: parentInfo.parentName.split(' ').slice(1).join(' ') || '',
              address: '',
              city: '',
              state: '',
              zipCode: '',
              phone: '',
            }
          }
        }
      });
    }

    // Process ethnicity data for invitation
    let invitationEthnicity = childInfo.ethnicity;
    if (Array.isArray(childInfo.ethnicity)) {
      const processedEthnicities = childInfo.ethnicity.map((ethnicity: string) => {
        if (ethnicity === "Other" && childInfo.ethnicityOther) {
          return childInfo.ethnicityOther;
        }
        return ethnicity;
      });
      invitationEthnicity = processedEthnicities.join(', ');
    }

    // Create child record for this user
    const child = await prisma.child.create({
      data: {
        userId: newUser.id,
        firstName: childInfo.firstName,
        lastName: childInfo.lastName,
        dob: childInfo.dob,
        sex: childInfo.sex,
        ethnicities: Array.isArray(childInfo.ethnicity) ? childInfo.ethnicity : [childInfo.ethnicity],
      }
    });

    // Handle kit assignment and order management
    let finalOrder = currentUserOrder;
    
    // Check if this is a multi-kit order
    if (currentUserOrder.kitCount > 1) {
      // Find the kit that needs to be transferred
      const kitToTransfer = await prisma.kit.findFirst({
        where: {
          orderId: currentUserOrder.id,
          childId: null
        }
      });
      
      if (kitToTransfer) {
        // Create a new order for the invited parent
        const newOrder = await prisma.order.create({
          data: {
            userId: newUser.id,
            orderNumber: `ORD-${Date.now().toString().slice(-6)}-${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`,
            status: 'ORDER_RECEIVED',
            kitCount: 1,
            statusUpdatedAt: new Date(),
          }
        });
        
        // Move the kit to the new order and associate it with the child
        await prisma.kit.update({
          where: { id: kitToTransfer.id },
          data: { 
            orderId: newOrder.id,
            childId: child.id
          }
        });
        
        // Update the original order's kit count
        await prisma.order.update({
          where: { id: currentUserOrder.id },
          data: { 
            kitCount: currentUserOrder.kitCount - 1,
            statusUpdatedAt: new Date()
          }
        });
        
        finalOrder = newOrder;
      }
    } else {
      // Single kit order - transfer the entire order to the new user
      finalOrder = await prisma.order.update({
        where: { id: currentUserOrder.id },
        data: {
          userId: newUser.id,
          statusUpdatedAt: new Date(),
        }
      });
      
      // Update the kit with the child ID
      const kitToUpdate = await prisma.kit.findFirst({
        where: {
          orderId: finalOrder.id,
          childId: null
        }
      });

      if (kitToUpdate) {
        await prisma.kit.update({
          where: { id: kitToUpdate.id },
          data: { childId: child.id }
        });
      }
    }

    // Check if the user is a parent for any children across all their orders
    // This ensures we don't change their role if they're a parent for any children
    const userChildren = await prisma.child.findMany({
      where: {
        userId: dbUser?.id
      }
    });
    
    // Check if user is a parent for any children
    const isParentForAnyChildren = userChildren.length > 0;
    
    // Only update role to PURCHASER if they're not a parent for any children
    if (!isParentForAnyChildren) {
      await prisma.user.update({
        where: { id: dbUser?.id },
        data: { role: 'PURCHASER' }
      });
    }

    // Store the invitation in the database for reference
    const invitation = await prisma.parentInvitation.create({
      data: {
        orderId: finalOrder.id,
        childFirstName: childInfo.firstName,
        childLastName: childInfo.lastName,
        childDOB: childInfo.dob,
        childSex: childInfo.sex,
        childEthnicity: invitationEthnicity,
        parentName: parentInfo.parentName,
        parentEmail: parentInfo.parentEmail,
        initiatedBy: initiatedBy,
        initiatorEmail: initiatorEmail,
        status: "PENDING",
        expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
      },
    });

    // Create Clerk invitation only if this is a new user (but don't send separate email)
    let clerkInvitationUrl: string | undefined;
    
    if (!existingUser) {
      try {
        const client = await clerkClient();
        const clerkInvitation = await client.invitations.createInvitation({
          emailAddress: parentInfo.parentEmail,
          publicMetadata: {
            role: 'PARENT',
            createdByParentInvitation: true,
            invitationId: invitation.id,
            orderId: finalOrder.id,
            childFirstName: childInfo.firstName,
            childLastName: childInfo.lastName,
            childDOB: childInfo.dob,
            childSex: childInfo.sex,
            childEthnicity: invitationEthnicity,
          },
          redirectUrl: process.env.NEXT_PUBLIC_CLERK_INVITATION_REDIRECT_URL || 'http://localhost:3000/invitation?redirect_url=/onboarding',
        });
        
        // Construct the Clerk invitation URL manually
        // Format: https://{clerk-domain}/v1/tickets/accept?ticket={invitation-id}
        const clerkDomain = process.env.CLERK_DOMAIN || 'legal-lamprey-78.clerk.accounts.dev';
        clerkInvitationUrl = `https://${clerkDomain}/v1/tickets/accept?ticket=${clerkInvitation.id}`;
      } catch (clerkError: any) {
        if (clerkError.errors?.[0]?.code === 'duplicate_record') {
          // For duplicate invitations, we still need a URL for our email
          // Use the same redirect URL that would work for existing invitations
          clerkInvitationUrl = process.env.NEXT_PUBLIC_CLERK_INVITATION_REDIRECT_URL || 'http://localhost:3000/invitation?redirect_url=/onboarding';
        } else {
          console.error('Failed to create Clerk invitation:', clerkError);
          // Don't fail the entire request if Clerk invitation fails
        }
      }
    }

    // Send appropriate email based on whether user is new or existing
    try {
      const { emailService } = await import('@/lib/email-service');
      
      if (!existingUser) {
        // Send invitation email for new user
        await emailService.sendParentInvitation({
          to: parentInfo.parentEmail,
          childName: `${childInfo.firstName} ${childInfo.lastName}`,
          inviterName: inviterName,
        });
      } else {
        // Send notification email for existing user
        // For existing users, we don't have a Clerk invitation link, so they'll need to sign in normally
        await emailService.sendParentInvitation({
          to: parentInfo.parentEmail,
          childName: `${childInfo.firstName} ${childInfo.lastName}`,
          inviterName: inviterName,
        });
      }
    } catch (emailError) {
      console.error("Failed to send email:", emailError);
      // Don't fail the entire request if email fails, but log it
    }

    return NextResponse.json({
      success: true,
      message: "Invitation sent successfully",
      invitationId: invitation.id,
      orderId: finalOrder.id,
    });

  } catch (error) {
    console.error("Error creating parent invitation:", error);
    
    // Return more detailed error information for debugging
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }
    
    return NextResponse.json(
      { error: "Failed to send invitation" },
      { status: 500 }
    );
  }
} 