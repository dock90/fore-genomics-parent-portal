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
    const { userInfo, childInfo } = body;

    // Get user's email from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ error: "User email not found" }, { status: 400 });
    }

    // Find or create user in database
    let user = await prisma.user.findUnique({
      where: { email: userEmail },
    });

    if (!user) {
      // Create user if they don't exist
      user = await prisma.user.create({
        data: {
          id: userId,
          email: userEmail,
          role: "PARENT",
        },
      });
    }

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

    // Create child record with due date
    // Store due date as string in YYYY-MM-DD format
    await prisma.child.create({
      data: {
        userId: user.id,
        dueDate: childInfo.dueDate, // Already in YYYY-MM-DD format from form
        // Other fields will be filled in after birth
      }
    });

    // Note: We don't mark onboarding as complete for unborn children
    // They will need to complete the full onboarding process after birth

    return NextResponse.json({ 
      success: true, 
      message: "Unborn child registration completed successfully" 
    });

  } catch (error) {
    console.error("Error saving unborn child data:", error);
    return NextResponse.json(
      { error: "Failed to save unborn child data" },
      { status: 500 }
    );
  }
} 