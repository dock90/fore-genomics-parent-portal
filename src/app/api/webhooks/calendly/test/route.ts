import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  return NextResponse.json({ 
    message: 'Calendly webhook endpoint is working',
    endpoint: '/api/webhooks/calendly',
    events: ['invitee.created', 'invitee.canceled'],
    instructions: 'Configure this URL in your Calendly webhook settings'
  });
} 