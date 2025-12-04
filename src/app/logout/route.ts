import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";

// Mark this route as dynamic to eliminate build warnings
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();

    if (!userId) {
      // If no user is authenticated, just redirect to home
      return NextResponse.redirect(new URL("/", request.url));
    }

    // Try to sign out the user from Clerk
    try {
      const client = await clerkClient();
      await client.sessions.revokeSession(userId);
    } catch (clerkError) {
      // If the user was already deleted from Clerk (like during reset),
      // this will fail but that's expected
    }

    // Redirect to home page
    return NextResponse.redirect(new URL("/", request.url));
  } catch (error) {
    console.error("Error in logout route:", error);
    // Even if there's an error, redirect to home
    return NextResponse.redirect(new URL("/", request.url));
  }
}
