import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";
import { getAuthRedirectUrl } from "@/lib/auth-redirect";

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const { userId } = await auth();
    const { searchParams } = new URL(request.url);
    const explicitRedirect = searchParams.get("redirect_url");

    // Not authenticated - go to sign-in
    if (!userId) {
      return NextResponse.json({ redirectUrl: "/sign-in" });
    }

    // If there's an explicit redirect URL (not "/" or empty), honor it
    if (explicitRedirect && explicitRedirect !== "/" && explicitRedirect !== "") {
      return NextResponse.json({ redirectUrl: explicitRedirect });
    }

    // Use the shared redirect logic
    const redirectUrl = await getAuthRedirectUrl();
    return NextResponse.json({ redirectUrl });
  } catch (error) {
    console.error("Auth redirect error:", error);
    // Fallback to onboarding on error
    return NextResponse.json({ redirectUrl: "/onboarding" });
  }
}
