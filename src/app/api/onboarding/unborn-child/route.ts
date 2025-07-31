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
      return NextResponse.json(
        { error: "User email not found" },
        { status: 400 }
      );
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
      },
    });

    // Create child record with due date
    // Store due date as string in YYYY-MM-DD format
    const child = await prisma.child.create({
      data: {
        userId: user.id,
        dueDate: childInfo.dueDate, // Already in YYYY-MM-DD format from form
        // Other fields will be filled in after birth
      },
    });

    // Handle unborn child kit separation
    const existingOrder = await prisma.order.findFirst({
      where: {
        OR: [{ parentId: user.id }, { purchaserId: user.id }],
      },
      include: {
        kits: true,
      },
    });

    let hasOtherIncompleteOrders = false;

    if (existingOrder) {
      // Only create a new order if this is a multi-kit order
      if (existingOrder.kitCount > 1) {
        // Find the kit that corresponds to this unborn child
        // For now, we'll assume it's the first kit without a child
        const unbornKit = existingOrder.kits.find((kit) => !kit.childId);

        if (unbornKit) {
          // Create a new order for the unborn child
          const newOrder = await prisma.order.create({
            data: {
              parentId: user.id, // User is the parent
              purchaserId: user.id, // Same user is both parent and purchaser
              orderNumber: `ORD-${Date.now().toString().slice(-6)}-${Math.floor(
                Math.random() * 1000
              )
                .toString()
                .padStart(3, "0")}`,
              status: "ONBOARDING_COMPLETED",
              kitCount: 1,
              statusUpdatedAt: new Date(),
            },
          });

          // Move the unborn kit to the new order and associate it with the child
          await prisma.kit.update({
            where: { id: unbornKit.id },
            data: {
              orderId: newOrder.id,
              childId: child.id,
            },
          });

          // Update the original order's kit count
          await prisma.order.update({
            where: { id: existingOrder.id },
            data: {
              kitCount: existingOrder.kitCount - 1,
              status: "ONBOARDING_COMPLETED", // Update status since remaining kits should be complete
              statusUpdatedAt: new Date(),
            },
          });

          // Check if the original order still needs onboarding completion
          const updatedOriginalOrder = await prisma.order.findUnique({
            where: { id: existingOrder.id },
            include: {
              kits: {
                include: {
                  child: true,
                  consent: true,
                  questionnaire: true,
                },
              },
            },
          });

          if (updatedOriginalOrder) {
            const incompleteKits = updatedOriginalOrder.kits.filter(
              (kit) => !kit.childId || !kit.consentId || !kit.questionnaireId
            );
            hasOtherIncompleteOrders = incompleteKits.length > 0;
          }
        }
      } else {
        // Single kit order - find the kit and associate it with the child
        const singleKit = existingOrder.kits.find((kit) => !kit.childId);
        if (singleKit) {
          await prisma.kit.update({
            where: { id: singleKit.id },
            data: { childId: child.id },
          });
        }

        // Update the status to indicate unborn child onboarding is complete
        await prisma.order.update({
          where: { id: existingOrder.id },
          data: {
            status: "ONBOARDING_COMPLETED",
            statusUpdatedAt: new Date(),
          },
        });
      }
    }

    return NextResponse.json({
      success: true,
      hasOtherIncompleteOrders,
    });
  } catch (error) {
    console.error("Error saving unborn child data:", error);
    return NextResponse.json(
      { error: "Failed to save unborn child data" },
      { status: 500 }
    );
  }
}
