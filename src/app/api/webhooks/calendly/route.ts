import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';

// Verify Calendly webhook signature according to official docs
function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  // The signature should be in format: t=timestamp,v1=hash
  const signatureParts = signature.split(',');
  const timestamp = signatureParts.find(part => part.startsWith('t='))?.split('=')[1];
  const hash = signatureParts.find(part => part.startsWith('v1='))?.split('=')[1];
  
  if (!timestamp || !hash) {
    return false;
  }
  
  // Create the signed payload: timestamp + "." + payload
  const signedPayload = `${timestamp}.${payload}`;
  
  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(signedPayload)
    .digest('hex');
  
  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get('calendly-webhook-signature');
    
    // Verify webhook signature using the signing key
    const webhookSigningKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;
    
    if (!webhookSigningKey) {
      console.error('CALENDLY_WEBHOOK_SIGNING_KEY not configured');
      return NextResponse.json({ error: 'Webhook signing key not configured' }, { status: 500 });
    }
    
    if (!signature) {
      console.error('No webhook signature provided');
      return NextResponse.json({ error: 'No signature provided' }, { status: 401 });
    }
    
    if (!verifyWebhookSignature(body, signature, webhookSigningKey)) {
      console.error('Invalid webhook signature');
      return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
    }
    
    const event = JSON.parse(body);
    console.log('Calendly webhook received:', event.event);
    console.log('Full webhook payload:', JSON.stringify(event, null, 2));
    
    // Handle different event types
    switch (event.event) {
      case 'invitee.created':
        await handleInviteeCreated(event);
        break;
      case 'invitee.canceled':
        await handleInviteeCanceled(event);
        break;
      default:
        console.log('Unhandled event type:', event.event);
    }
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return NextResponse.json({ error: 'Webhook processing failed' }, { status: 500 });
  }
}

async function handleInviteeCreated(event: any) {
  try {
    console.log('Processing invitee.created event with structure:', Object.keys(event));
    
    // The invitee data is directly in event.payload
    const invitee = event.payload;
    const scheduledEvent = event.payload.scheduled_event;
    
    if (!invitee || !invitee.email) {
      console.error('No invitee or email found in webhook data');
      return;
    }
    
    const userEmail = invitee.email;
    
    console.log('Processing invitee.created for:', userEmail);
    
    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: userEmail }
    });
    
    if (!user) {
      console.log('User not found for email:', userEmail);
      return;
    }
    
    // Get event type details to determine if it's pre-test or post-test
    // We need to fetch the event type details using the URI
    let isPreTest = false;
    if (scheduledEvent?.event_type) {
      try {
        const eventTypeResponse = await fetch(scheduledEvent.event_type, {
          headers: {
            'Authorization': `Bearer ${process.env.CALENDLY_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (eventTypeResponse.ok) {
          const eventType = await eventTypeResponse.json();
          const eventTypeName = eventType.resource?.name || '';
          isPreTest = eventTypeName.toLowerCase().includes('pre-test') || 
                     eventTypeName.toLowerCase().includes('pretest');
          console.log('Event type name:', eventTypeName, 'isPreTest:', isPreTest);
        }
      } catch (error) {
        console.error('Error fetching event type details:', error);
      }
    }
    
    // Update user's counseling status
    const updateData: any = {};
    
    if (isPreTest) {
      updateData.preTestCounselingScheduled = true;
      updateData.preTestCounselingDate = new Date(scheduledEvent.start_time);
      updateData.preTestCounselingEventId = scheduledEvent.event_type;
      updateData.preTestCounselingInviteeId = invitee.uri;
    } else {
      updateData.postTestCounselingScheduled = true;
      updateData.postTestCounselingDate = new Date(scheduledEvent.start_time);
      updateData.postTestCounselingEventId = scheduledEvent.event_type;
      updateData.postTestCounselingInviteeId = invitee.uri;
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
    
    console.log(`Updated ${isPreTest ? 'pre-test' : 'post-test'} counseling status for user:`, userEmail);
    
  } catch (error) {
    console.error('Error handling invitee.created:', error);
    throw error;
  }
}

async function handleInviteeCanceled(event: any) {
  try {
    console.log('Processing invitee.canceled event with structure:', Object.keys(event));
    
    // The invitee data is directly in event.payload
    const invitee = event.payload;
    const scheduledEvent = event.payload.scheduled_event;
    
    if (!invitee || !invitee.email) {
      console.error('No invitee or email found in webhook data');
      return;
    }
    
    const userEmail = invitee.email;
    
    console.log('Processing invitee.canceled for:', userEmail);
    
    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: userEmail }
    });
    
    if (!user) {
      console.log('User not found for email:', userEmail);
      return;
    }
    
    // Get event type details to determine if it's pre-test or post-test
    let isPreTest = false;
    if (scheduledEvent?.event_type) {
      try {
        const eventTypeResponse = await fetch(scheduledEvent.event_type, {
          headers: {
            'Authorization': `Bearer ${process.env.CALENDLY_ACCESS_TOKEN}`,
            'Content-Type': 'application/json',
          }
        });
        
        if (eventTypeResponse.ok) {
          const eventType = await eventTypeResponse.json();
          const eventTypeName = eventType.resource?.name || '';
          isPreTest = eventTypeName.toLowerCase().includes('pre-test') || 
                     eventTypeName.toLowerCase().includes('pretest');
          console.log('Event type name:', eventTypeName, 'isPreTest:', isPreTest);
        }
      } catch (error) {
        console.error('Error fetching event type details:', error);
      }
    }
    
    // Reset user's counseling status
    const updateData: any = {};
    
    if (isPreTest) {
      updateData.preTestCounselingScheduled = false;
      updateData.preTestCounselingDate = null;
      updateData.preTestCounselingEventId = null;
      updateData.preTestCounselingInviteeId = null;
    } else {
      updateData.postTestCounselingScheduled = false;
      updateData.postTestCounselingDate = null;
      updateData.postTestCounselingEventId = null;
      updateData.postTestCounselingInviteeId = null;
    }
    
    await prisma.user.update({
      where: { id: user.id },
      data: updateData
    });
    
    console.log(`Reset ${isPreTest ? 'pre-test' : 'post-test'} counseling status for user:`, userEmail);
    
  } catch (error) {
    console.error('Error handling invitee.canceled:', error);
    throw error;
  }
} 