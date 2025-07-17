import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const clientId = process.env.CALENDLY_CLIENT_ID;
  
  // Use localhost for local development, staging domain for production
  const isLocalhost = request.headers.get('host')?.includes('localhost');
  const redirectUri = isLocalhost 
    ? 'http://localhost:3000/api/calendly/oauth/callback'
    : 'https://fore-genomics-parent-portal-env-staging-adam-lands-projects.vercel.app/api/calendly/oauth/callback';
  
  if (!clientId) {
    return NextResponse.json({ error: 'CALENDLY_CLIENT_ID not configured' }, { status: 500 });
  }

  // Generate authorization URL
  const authUrl = `https://auth.calendly.com/oauth/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}`;
  
  // Redirect to Calendly authorization
  return NextResponse.redirect(authUrl);
} 