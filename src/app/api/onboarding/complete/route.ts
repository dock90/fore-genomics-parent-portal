import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const {
      userEmail,
      userInfo,
      childInfo,
      consentAccepted,
      questionnaire
    } = body;

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
    await prisma.child.create({
      data: {
        userId: user.id,
        firstName: childInfo.firstName,
        lastName: childInfo.lastName,
        dob: new Date(childInfo.dob),
        sex: childInfo.sex,
        ethnicity: childInfo.ethnicity,
      }
    });

    // Create consent record
    await prisma.consent.create({
      data: {
        userId: user.id,
        accepted: consentAccepted,
      }
    });

    // Create questionnaire record
    await prisma.questionnaire.create({
      data: {
        userId: user.id,
        question1: questionnaire.question1,
        question1Details: questionnaire.question1Details || null,
        question2: questionnaire.question2,
        question2Details: questionnaire.question2Details || null,
        question3: questionnaire.question3,
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