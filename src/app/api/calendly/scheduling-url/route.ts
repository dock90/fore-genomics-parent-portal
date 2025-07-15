import { NextRequest, NextResponse } from 'next/server';
import { calendlyService } from '@/lib/calendly';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type'); // 'pre-test' or 'post-test'
    
    if (!type) {
      return NextResponse.json({ error: 'Type parameter is required' }, { status: 400 });
    }

    // Map counseling types to event type slugs
    // You'll need to update these to match your actual Calendly event type slugs
    const eventTypeSlug = type === 'pre-test' 
      ? process.env.CALENDLY_PRE_TEST_EVENT_SLUG || 'pre-test-counseling'
      : process.env.CALENDLY_POST_TEST_EVENT_SLUG || 'post-test-counseling';

    const schedulingUrl = await calendlyService.getSchedulingUrl(eventTypeSlug);
    
    if (!schedulingUrl) {
      return NextResponse.json({ error: 'Event type not found' }, { status: 404 });
    }

    return NextResponse.json({ schedulingUrl });
  } catch (error) {
    console.error('Error getting scheduling URL:', error);
    return NextResponse.json({ error: 'Failed to get scheduling URL' }, { status: 500 });
  }
} 