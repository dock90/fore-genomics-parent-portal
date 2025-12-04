import { NextResponse } from "next/server";

export async function GET() {
  const clientId = process.env.CALENDLY_CLIENT_ID;

  // Use environment variable for redirect URI
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const redirectUri = `${baseUrl}/api/calendly/oauth/callback`;

  if (!clientId) {
    return NextResponse.json(
      { error: "CALENDLY_CLIENT_ID not configured" },
      { status: 500 }
    );
  }

  // Generate authorization URL
  const authUrl = `https://auth.calendly.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;

  // Redirect to Calendly authorization
  return NextResponse.redirect(authUrl);
}
