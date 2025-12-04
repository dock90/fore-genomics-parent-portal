import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { calendlyService } from "@/lib/calendly";
import crypto from "crypto";

// Verify Calendly webhook signature according to official docs
function verifyWebhookSignature(
  payload: string,
  signature: string,
  secret: string
): boolean {
  // The signature should be in format: t=timestamp,v1=hash
  const signatureParts = signature.split(",");
  const timestamp = signatureParts
    .find((part) => part.startsWith("t="))
    ?.split("=")[1];
  const hash = signatureParts
    .find((part) => part.startsWith("v1="))
    ?.split("=")[1];

  if (!timestamp || !hash) {
    return false;
  }

  // Create the signed payload: timestamp + "." + payload
  const signedPayload = `${timestamp}.${payload}`;

  // Calculate expected signature
  const expectedSignature = crypto
    .createHmac("sha256", secret)
    .update(signedPayload)
    .digest("hex");

  return crypto.timingSafeEqual(
    Buffer.from(hash),
    Buffer.from(expectedSignature)
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("calendly-webhook-signature");

    // Verify webhook signature using the signing key
    const webhookSigningKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY;

    if (!webhookSigningKey) {
      console.error("CALENDLY_WEBHOOK_SIGNING_KEY not configured");
      return NextResponse.json(
        { error: "Webhook signing key not configured" },
        { status: 500 }
      );
    }

    if (!signature) {
      console.error("No webhook signature provided");
      return NextResponse.json(
        { error: "No signature provided" },
        { status: 401 }
      );
    }

    if (!verifyWebhookSignature(body, signature, webhookSigningKey)) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const event = JSON.parse(body);

    // Handle different event types
    switch (event.event) {
      case "invitee.created":
        await handleInviteeCreated(event);
        break;
      case "invitee.canceled":
        await handleInviteeCanceled(event);
        break;
      default:
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook processing failed" },
      { status: 500 }
    );
  }
}

async function handleInviteeCreated(event: any) {
  try {
    // The invitee data is directly in event.payload
    const invitee = event.payload;
    const scheduledEvent = event.payload.scheduled_event;

    if (!invitee || !invitee.email) {
      console.error("No invitee or email found in webhook data");
      return;
    }

    const userEmail = invitee.email;

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      include: {
        parentOrders: true,
        purchaserOrders: true,
      },
    });

    if (!user) {
      return;
    }

    // Get the appropriate orders based on user role
    const userOrders =
      user.role === "PARENT" ? user.parentOrders : user.purchaserOrders;

    // Get the most recent order for this user
    const latestOrder = userOrders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    if (!latestOrder) {
      return;
    }

    // Determine if it's pre-test or post-test based on the event name
    const eventName = scheduledEvent?.name || "";
    const isPreTest =
      eventName.toLowerCase().includes("pre-test") ||
      eventName.toLowerCase().includes("pretest");

    // Update order's counseling status
    const updateData: any = {};

    if (isPreTest) {
      updateData.preTestCounselingDate = new Date(scheduledEvent.start_time);
      updateData.preTestCounselingEventId = scheduledEvent.event_type;
      updateData.preTestCounselingInviteeId = invitee.uri;
    } else {
      updateData.postTestCounselingDate = new Date(scheduledEvent.start_time);
      updateData.postTestCounselingEventId = scheduledEvent.event_type;
      updateData.postTestCounselingInviteeId = invitee.uri;
    }

    await prisma.order.update({
      where: { id: latestOrder.id },
      data: updateData,
    });
  } catch (error) {
    console.error("Error handling invitee.created:", error);
    throw error;
  }
}

async function handleInviteeCanceled(event: any) {
  try {
    // The invitee data is directly in event.payload
    const invitee = event.payload;
    const scheduledEvent = event.payload.scheduled_event;

    if (!invitee || !invitee.email) {
      console.error("No invitee or email found in webhook data");
      return;
    }

    const userEmail = invitee.email;

    // Find user by email
    const user = await prisma.user.findFirst({
      where: { email: userEmail },
      include: {
        parentOrders: true,
        purchaserOrders: true,
      },
    });

    if (!user) {
      return;
    }

    // Get the appropriate orders based on user role
    const userOrders =
      user.role === "PARENT" ? user.parentOrders : user.purchaserOrders;

    // Get the most recent order for this user
    const latestOrder = userOrders.sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    )[0];

    if (!latestOrder) {
      return;
    }

    // Determine if it's pre-test or post-test based on the event name
    const eventName = scheduledEvent?.name || "";
    const isPreTest =
      eventName.toLowerCase().includes("pre-test") ||
      eventName.toLowerCase().includes("pretest");

    // Reset order's counseling status
    const updateData: any = {};

    if (isPreTest) {
      updateData.preTestCounselingDate = null;
      updateData.preTestCounselingEventId = null;
      updateData.preTestCounselingInviteeId = null;
    } else {
      updateData.postTestCounselingDate = null;
      updateData.postTestCounselingEventId = null;
      updateData.postTestCounselingInviteeId = null;
    }

    await prisma.order.update({
      where: { id: latestOrder.id },
      data: updateData,
    });
  } catch (error) {
    console.error("Error handling invitee.canceled:", error);
    throw error;
  }
}
