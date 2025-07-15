import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const error = searchParams.get('error');

  if (error) {
    return NextResponse.json({ error: `Authorization failed: ${error}` }, { status: 400 });
  }

  if (!code) {
    return NextResponse.json({ error: 'No authorization code received' }, { status: 400 });
  }

  // This endpoint is primarily for the OAuth setup script
  // In production, you might want to handle the token exchange here
  // and store the token securely in your database
  
  return NextResponse.json({ 
    message: 'Authorization code received successfully',
    code: code 
  });
} 