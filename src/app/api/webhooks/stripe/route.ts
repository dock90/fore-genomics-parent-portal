import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { StripeOrderService } from "@/lib/stripe-order-service";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2025-07-30.basil",
});

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export async function POST(req: NextRequest) {
  // Set CORS headers for Stripe webhooks
  const response = NextResponse.next();
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, HEAD");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "stripe-signature, content-type"
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe signature" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err: any) {
      console.error(`❌ Webhook signature verification failed: ${err.message}`);
      return NextResponse.json(
        { error: `Webhook Error: ${err.message}` },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      case "checkout.session.completed":
        const checkoutSession = event.data.object as Stripe.Checkout.Session;

        // Retrieve the session with expanded line items and products
        try {
          const { line_items } = await stripe.checkout.sessions.retrieve(
            checkoutSession.id,
            { expand: ["line_items", "line_items.data.price.product"] }
          );

          // Create order using StripeOrderService
          const order = await StripeOrderService.createOrderFromCheckout({
            ...checkoutSession,
            line_items: line_items, // Pass the expanded line items
          });
        } catch (retrieveError: any) {
          console.error(
            "❌ Error processing checkout session:",
            retrieveError.message
          );
          return NextResponse.json(
            { error: retrieveError.message },
            { status: 500 }
          );
        }

        break;

      case "payment_intent.succeeded":
        const paymentIntent = event.data.object as Stripe.PaymentIntent;

        // TODO: Create new order here instead of manual admin creation
        // For now, just log the event data

        break;

      default:
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error("❌ Webhook error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}

export async function HEAD() {
  // Handle HEAD requests for webhook endpoint verification
  const response = NextResponse.json({});
  response.headers.set("Access-Control-Allow-Origin", "*");
  response.headers.set("Access-Control-Allow-Methods", "POST, HEAD");
  response.headers.set(
    "Access-Control-Allow-Headers",
    "stripe-signature, content-type"
  );
  return response;
}
