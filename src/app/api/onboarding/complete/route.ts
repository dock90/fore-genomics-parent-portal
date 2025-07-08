import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { auth, clerkClient } from '@clerk/nextjs/server';

export async function POST(request: NextRequest) {
  console.log("=== API route called ===");
  try {
    console.log("Attempting auth...");
    const { userId } = await auth();
    console.log("Auth userId:", userId);
    if (!userId) {
      console.log("No userId, returning 401");
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      );
    }

    console.log("Parsing request body...");
    const body = await request.json();
    console.log("Request body:", body);
    const {
      userEmail,
      userInfo,
      childInfo,
      consentAccepted,
      questionnaire
    } = body;
    console.log("Extracted data:", { userEmail, userInfo, childInfo, consentAccepted, questionnaire });

    console.log("Creating/finding user...");
    // Create or find user
    const user = await prisma.user.upsert({
      where: { email: userEmail },
      update: {},
      create: { email: userEmail }
    });
    console.log("User created/found:", user);

    console.log("Creating user profile...");
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
    console.log("User profile created/updated");

    console.log("Creating child record...");
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
    console.log("Child record created");

    console.log("Creating consent record...");
    // Create consent record
    await prisma.consent.create({
      data: {
        userId: user.id,
        accepted: consentAccepted,
      }
    });
    console.log("Consent record created");

    console.log("Creating questionnaire record...");
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
    console.log("Questionnaire record created");

    console.log("Updating Clerk metadata...");
    // Update Clerk user's publicMetadata to mark onboarding as complete
    try {
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: {
          onboardingComplete: true,
          onboardingCompletedAt: new Date().toISOString()
        }
      });
      console.log("Clerk metadata updated successfully");
    } catch (clerkError) {
      console.error('Failed to update Clerk metadata:', clerkError);
      // Don't fail the entire request if Clerk update fails
    }

    console.log("=== All operations completed successfully ===");
    console.log("Returning success response");
    return NextResponse.json({ 
      success: true, 
      message: 'Onboarding completed successfully' 
    });

  } catch (error) {
    console.error('=== ONBOARDING ERROR ===');
    console.error('Error type:', typeof error);
    console.error('Error message:', (error as any).message);
    console.error('Error stack:', (error as any).stack);
    console.error('Full error object:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to complete onboarding' },
      { status: 500 }
    );
  }
} 