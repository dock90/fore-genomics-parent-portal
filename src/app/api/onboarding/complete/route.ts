import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';

// Dynamic import to prevent build-time issues
const getPrisma = async () => {
  const { prisma } = await import('@/lib/prisma');
  return prisma;
};

// Dynamic imports for Google Storage and Email services
const getGoogleStorageService = async () => {
  const { googleStorageService } = await import('@/lib/google-storage');
  return googleStorageService;
};

const getEmailService = async () => {
  const { emailService } = await import('@/lib/email-service');
  return emailService;
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    const body = await request.json();
    const {
      userEmail,
      userInfo,
      childInfo,
      consentAccepted,
      consentData, // New consent data structure
      questionnaire
    } = body;

    // Check if this is an invitation flow first
    const prisma = await getPrisma();
    const invitation = await prisma.parentInvitation.findFirst({
      where: {
        parentEmail: userEmail,
        childFirstName: childInfo.firstName,
        childLastName: childInfo.lastName,
        status: "PENDING",
        expiresAt: { gt: new Date() }
      },
    });

    // If this is a valid invitation, we can proceed even without authentication
    // or with a different authenticated user (they'll be signed out and redirected)
    if (invitation) {
      console.log('Processing invitation flow for email:', userEmail);
      
      // If user is authenticated but with different email, that's okay for invitation flow
      // The frontend will handle the sign-out and redirect
      if (userId) {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const currentUserEmail = clerkUser.emailAddresses[0]?.emailAddress;
        
        if (userEmail !== currentUserEmail) {
          console.log('Email mismatch in invitation flow:', currentUserEmail, 'vs', userEmail);
          // Continue with invitation flow, but return a special response
          // that tells the frontend to handle the email mismatch
        }
      }
    } else {
      // Not an invitation flow, require authentication
      if (!userId) {
        return NextResponse.json(
          { success: false, message: 'Unauthorized' },
          { status: 401 }
        );
      }

      // Get the current user's email from Clerk
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      const currentUserEmail = clerkUser.emailAddresses[0]?.emailAddress;

      // Verify email matches for non-invitation flows
      if (userEmail !== currentUserEmail) {
        return NextResponse.json(
          { success: false, message: 'Email mismatch' },
          { status: 403 }
        );
      }
    }

    // Get client IP and user agent for audit trail
    const ipAddress = request.headers.get('x-forwarded-for') || 
                     request.headers.get('x-real-ip') || 
                     'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    // Create or find user
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: { email: userEmail }
    });

    // Create user profile
    await prisma.userProfile.upsert({
      where: { userId: user.id },
      update: {
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        address: userInfo.address,
        city: userInfo.city,
        state: userInfo.state,
        zipCode: userInfo.zipCode,
        phone: userInfo.phone,
      },
      create: {
        userId: user.id,
        firstName: userInfo.firstName,
        lastName: userInfo.lastName,
        address: userInfo.address,
        city: userInfo.city,
        state: userInfo.state,
        zipCode: userInfo.zipCode,
        phone: userInfo.phone,
      }
    });

    // Create child record
    // Store DOB as string in YYYY-MM-DD format
    await prisma.child.create({
      data: {
        userId: user.id,
        firstName: childInfo.firstName,
        lastName: childInfo.lastName,
        dob: childInfo.dob, // Already in YYYY-MM-DD format from form
        sex: childInfo.sex,
        ethnicity: childInfo.ethnicity,
      }
    });

    // Create consent record with signature data
    await prisma.consent.create({
      data: {
        userId: user.id,
        accepted: Boolean(consentAccepted),
        part1Accepted: Boolean(consentData?.part1Accepted) || false,
        part2Accepted: Boolean(consentData?.part2Accepted) || false,
        part3Accepted: Boolean(consentData?.part3Accepted) || false,
        consentAll: Boolean(consentData?.consentAll) || false,
        signature: consentData?.signature || null,
        signatureDate: consentData?.signatureDate ? new Date(consentData.signatureDate) : null,
        signerName: consentData?.signerName || null,
        relationshipToChild: consentData?.relationshipToChild || null,
        childName: consentData?.childName || null,
        childDOB: consentData?.childDOB || null, // Store as string
        ipAddress,
        userAgent,
      }
    });

    // Create questionnaire record
    await prisma.questionnaire.create({
      data: {
        userId: user.id,
        question1: Boolean(questionnaire.question1),
        question1Details: questionnaire.question1Details || null,
        question2: Boolean(questionnaire.question2),
        question2Details: questionnaire.question2Details || null,
        question3: Boolean(questionnaire.question3),
        question3Details: questionnaire.question3Details || null,
      }
    });

    // Create order if not exists
    const existingOrder = await prisma.order.findFirst({ where: { userId: user.id } });
    if (!existingOrder) {
      const orderNumber = `ORD-${Date.now()}-${user.id.slice(-6)}`;
      await prisma.order.create({
        data: {
          userId: user.id,
          orderNumber,
          status: 'PREPARING_ORDER',
          statusUpdatedAt: new Date(),
        }
      });
    } else {
      // Update existing order status to PREPARING_ORDER if it's still in ONBOARDING_COMPLETED
      if (existingOrder.status === 'ONBOARDING_COMPLETED') {
        await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            status: 'PREPARING_ORDER',
            statusUpdatedAt: new Date(),
          }
        });
      }
    }

    // Update Clerk user's publicMetadata to mark onboarding as complete
    // Only if user is authenticated (not for invitation flows without auth)
    if (userId) {
      try {
        const client = await clerkClient();
        await client.users.updateUser(userId, {
          publicMetadata: {
            onboardingComplete: true,
            onboardingCompletedAt: new Date().toISOString()
          }
        });
      } catch (clerkError) {
        console.error('Failed to update Clerk metadata:', clerkError);
        // Don't fail the entire request if Clerk update fails
      }
    }

    // Create Google Sheet and send emails (async, don't block response)
    try {
      const orderNumber = existingOrder?.orderNumber || `ORD-${Date.now()}-${user.id.slice(-6)}`;
      
      // Prepare data for Google Sheets
      const sheetData = {
        userInfo: {
          firstName: userInfo.firstName,
          lastName: userInfo.lastName,
          email: userEmail,
          address: userInfo.address,
          city: userInfo.city,
          state: userInfo.state,
          zipCode: userInfo.zipCode,
          phone: userInfo.phone,
        },
        childInfo: {
          firstName: childInfo.firstName,
          lastName: childInfo.lastName,
          dob: childInfo.dob,
          sex: childInfo.sex,
          ethnicity: childInfo.ethnicity,
        },
        consentData: {
          part1Accepted: Boolean(consentData?.part1Accepted) || false,
          part2Accepted: Boolean(consentData?.part2Accepted) || false,
          part3Accepted: Boolean(consentData?.part3Accepted) || false,
          consentAll: Boolean(consentData?.consentAll) || false,
          signature: consentData?.signature || null,
          signatureDate: consentData?.signatureDate || null,
          signerName: consentData?.signerName || null,
          relationshipToChild: consentData?.relationshipToChild || null,
          childName: consentData?.childName || null,
          childDOB: consentData?.childDOB || null,
        },
        questionnaire: {
          question1: Boolean(questionnaire.question1),
          question1Details: questionnaire.question1Details || null,
          question2: Boolean(questionnaire.question2),
          question2Details: questionnaire.question2Details || null,
          question3: Boolean(questionnaire.question3),
          question3Details: questionnaire.question3Details || null,
        },
        orderNumber,
        ipAddress,
        userAgent,
      };

      // Create Google Cloud Storage record
      const googleStorageService = await getGoogleStorageService();
      const { fileUrl } = await googleStorageService.createOnboardingRecord(sheetData);

      // Send admin notification email only
      const emailService = await getEmailService();
      const emailData = {
        userEmail,
        userName: `${userInfo.firstName} ${userInfo.lastName}`,
        childName: `${childInfo.firstName} ${childInfo.lastName}`,
        orderNumber,
        sheetUrl: fileUrl, // Use fileUrl instead of sheetUrl
      };

      // Send admin notification email
      await emailService.sendAdminNotification(emailData);

      console.log('Google Cloud Storage record created and emails sent successfully');
    } catch (error) {
      console.error('Failed to create Google Cloud Storage record or send emails:', error);
      // Don't fail the entire request if these services fail
    }

    // Check if this completion was from an invitation and notify the initiator
    try {
      const invitation = await prisma.parentInvitation.findFirst({
        where: {
          parentEmail: userEmail,
          childFirstName: childInfo.firstName,
          childLastName: childInfo.lastName,
          status: "PENDING",
          initiatorEmail: { not: null }
        },
      });

      if (invitation) {
        // Update invitation status and send notification
        await prisma.parentInvitation.update({
          where: { id: invitation.id },
          data: {
            status: "ACCEPTED",
            acceptedAt: new Date(),
            notifiedAt: new Date(),
          },
        });

        // Send email notification to initiator
        const emailService = await getEmailService();
        await emailService.sendInvitationCompleteNotification({
          to: invitation.initiatorEmail!,
          childName: `${childInfo.firstName} ${childInfo.lastName}`,
          parentEmail: userEmail,
        });
      }
    } catch (notificationError) {
      console.error('Failed to send invitation completion notification:', notificationError);
      // Don't fail the entire request if notification fails
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding completed successfully' 
    });

  } catch (error) {
    console.error('Onboarding error:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
} 