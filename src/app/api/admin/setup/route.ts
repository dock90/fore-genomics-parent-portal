import { NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { getDbUser } from "@/lib/user-service";

export async function POST() {
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

    // Get database user and check if admin
    const dbUser = await getDbUser(userId);

    if (!dbUser || dbUser.role !== "ADMIN") {
      return NextResponse.json(
        { error: "User not found or not admin" },
        { status: 403 }
      );
    }

    // Update Clerk user's publicMetadata with role
    const client = await clerkClient();
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
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
