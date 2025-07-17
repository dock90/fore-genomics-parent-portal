import { NextRequest, NextResponse } from 'next/server';
import { calendlyService } from '@/lib/calendly';

export async function GET(request: NextRequest) {
  try {
    // Test basic connectivity and token management
    const eventTypes = await calendlyService.getEventTypes();
    
    // Test getting specific event types by slug
    const preTestSlug = process.env.CALENDLY_PRE_TEST_EVENT_SLUG || 'pre-test-counseling';
    const postTestSlug = process.env.CALENDLY_POST_TEST_EVENT_SLUG || 'post-test-counseling';
    
    const preTestEvent = await calendlyService.getEventTypeBySlug(preTestSlug);
    const postTestEvent = await calendlyService.getEventTypeBySlug(postTestSlug);
    
    return NextResponse.json({
      success: true,
      message: 'Calendly service is working correctly',
      data: {
        organizationEventTypes: eventTypes.map(et => ({
          name: et.name,
          slug: et.slug,
          active: et.active,
          schedulingUrl: et.scheduling_url
        })),
        preTestEvent: preTestEvent ? {
          name: preTestEvent.name,
          slug: preTestEvent.slug,
          active: preTestEvent.active,
          schedulingUrl: preTestEvent.scheduling_url
        } : null,
        postTestEvent: postTestEvent ? {
          name: postTestEvent.name,
          slug: postTestEvent.slug,
          active: postTestEvent.active,
          schedulingUrl: postTestEvent.scheduling_url
        } : null,
        environment: {
          preTestSlug,
          postTestSlug,
          hasWebhookUrl: !!process.env.CALENDLY_WEBHOOK_URL,
          hasSigningKey: !!process.env.CALENDLY_WEBHOOK_SIGNING_KEY
        }
      }
    });
  } catch (error) {
    console.error('Calendly test error:', error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      message: 'Calendly service test failed'
    }, { status: 500 });
  }
} 