import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Dynamic import to prevent build-time issues
const getPrisma = async () => {
  const { prisma } = await import("@/lib/prisma");
  return prisma;
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Ensure we're not in build time
    if (process.env.NODE_ENV === "production" && !process.env.VERCEL) {
      return NextResponse.json(
        { error: "Not available in production build" },
        { status: 400 }
      );
    }

    // Get user email from Clerk
    const client = await clerkClient();
    const clerkUser = await client.users.getUser(userId);
    const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

    if (!userEmail) {
      return NextResponse.json({ error: "No email found" }, { status: 400 });
    }

    // Check if user exists in database and is admin
    const prisma = await getPrisma();
    const dbUser = await prisma.user.findFirst({
      where: { email: userEmail },
      select: { role: true },
    });

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "User not found or not admin" },
        { status: 403 }
      );
    }

    // Update Clerk user's publicMetadata with role
    await client.users.updateUser(userId, {
      publicMetadata: {
        role: "ADMIN",
      },
    });

    return NextResponse.json({
      success: true,
      message: "Admin role set in Clerk metadata",
    });
  } catch (error) {
    console.error("Error setting up admin:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
