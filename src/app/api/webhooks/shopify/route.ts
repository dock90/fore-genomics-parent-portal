import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { trackPlacedOrder } from '@/lib/klaviyo';

const log = createLogger('ShopifyWebhook');

/**
 * Verifies the Shopify HMAC signature on incoming webhook requests.
 * Shopify signs requests with HMAC-SHA256 using your webhook secret.
 * See: https://shopify.dev/docs/api/admin-rest/latest/resources/webhook
 */
function verifyShopifyHmac(rawBody: string, signature: string | null): boolean {
  const secret = process.env.SHOPIFY_WEBHOOK_SECRET;
  if (!secret) {
    log.error('SHOPIFY_WEBHOOK_SECRET is not set');
    return false;
  }
  if (!signature) {
    log.error('Missing X-Shopify-Hmac-Sha256 header');
    return false;
  }

  const digest = crypto
    .createHmac('sha256', secret)
    .update(rawBody, 'utf8')
    .digest('base64');

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(digest),
      Buffer.from(signature)
    );
  } catch {
    return false;
  }
}

/**
 * POST /api/webhooks/shopify
 *
 * Handles Shopify `orders/paid` webhook events.
 *
 * Flow:
 *   Shopify order paid → this handler
 *     → find-or-create User in DB
 *     → create Order + Kits in DB
 *     → send Clerk invitation email to the customer
 *     → return 200 (so Shopify does not retry)
 *
 * Register this in Shopify Admin:
 *   Settings → Notifications → Webhooks → Create webhook
 *   Event: Order payment
 *   URL:   https://[your-domain]/api/webhooks/shopify
 *   Format: JSON
 */
export async function POST(request: NextRequest) {
  // 1. Read the raw body (must be raw for HMAC verification)
  const rawBody = await request.text();

  // 2. Verify Shopify HMAC signature
  const shopifySignature = request.headers.get('x-shopify-hmac-sha256');
  if (!verifyShopifyHmac(rawBody, shopifySignature)) {
    log.error('Shopify HMAC verification failed');
    // Return 200 even on auth failure to prevent Shopify retry loops
    // (Shopify will disable the webhook after many 4xx failures)
    return NextResponse.json({ error: 'Invalid signature' }, { status: 401 });
  }

  // 3. Parse the event topic
  const topic = request.headers.get('x-shopify-topic');
  const shopId = request.headers.get('x-shopify-shop-domain');

  log.info(`Received Shopify webhook: ${topic} from ${shopId}`);

  // 4. Parse payload
  let payload: ShopifyOrder;
  try {
    payload = JSON.parse(rawBody) as ShopifyOrder;
  } catch (err) {
    log.error('Failed to parse Shopify webhook payload', err);
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 200 });
  }

  // 5. Only process orders/paid events
  if (topic !== 'orders/paid') {
    log.info(`Ignoring topic: ${topic}`);
    return NextResponse.json({ received: true }, { status: 200 });
  }

  try {
    await handleOrderPaid(payload);
  } catch (err) {
    log.error('Error handling orders/paid', err);
    // Still return 200 so Shopify doesn't retry — errors are logged
    return NextResponse.json({ received: true }, { status: 200 });
  }

  return NextResponse.json({ received: true }, { status: 200 });
}

async function handleOrderPaid(order: ShopifyOrder) {
  const customerEmail = order.email || order.customer?.email;
  const firstName = order.customer?.first_name || order.billing_address?.first_name || '';
  const lastName = order.customer?.last_name || order.billing_address?.last_name || '';
  const shopifyOrderId = String(order.id);
  const shopifyOrderNumber = order.order_number ? String(order.order_number) : shopifyOrderId;

  if (!customerEmail) {
    log.warn('Shopify order has no customer email — cannot send invite', {
      orderId: shopifyOrderId,
    });
    return;
  }

  log.info('Processing Shopify order', {
    orderId: shopifyOrderId,
    orderNumber: shopifyOrderNumber,
    email: customerEmail,
  });

  // Find or create user in DB
  let user = await prisma.user.findUnique({ where: { email: customerEmail } });
  const isNewUser = !user;

  if (!user) {
    user = await prisma.user.create({
      data: {
        email: customerEmail,
        role: 'PARENT',
        ...(firstName || lastName
          ? {
              profile: {
                create: {
                  firstName,
                  lastName,
                  address: order.billing_address?.address1 || '',
                  addressLine2: order.billing_address?.address2 || null,
                  city: order.billing_address?.city || '',
                  state: order.billing_address?.province_code || order.billing_address?.province || '',
                  zipCode: order.billing_address?.zip || '',
                  phone: order.billing_address?.phone || order.customer?.phone || '',
                },
              },
            }
          : {}),
      },
    });
    log.info('Created new user from Shopify order', { userId: user.id, email: customerEmail });
  }

  // Determine kit count from line items
  const kitCount = order.line_items?.reduce((sum, item) => sum + (item.quantity || 1), 0) ?? 1;

  // Create order record in DB
  const orderNumber = `${formatDate()}_SHP${shopifyOrderNumber}_${kitCount}`;

  const dbOrder = await prisma.order.create({
    data: {
      parentId: user.id,
      purchaserId: user.id,
      status: 'ORDER_RECEIVED',
      orderNumber,
      kitCount,
      statusUpdatedAt: new Date(),
      notes: `Shopify order #${shopifyOrderNumber} (id: ${shopifyOrderId})`,
    },
  });

  // Create kits
  for (let i = 0; i < kitCount; i++) {
    await prisma.kit.create({
      data: {
        orderId: dbOrder.id,
        kitNumber: i + 1,
        kitType: 'BASE',
      },
    });
  }

  log.info('Created order from Shopify', {
    dbOrderId: dbOrder.id,
    orderNumber,
    kitCount,
    isNewUser,
  });

  // Send Clerk invitation and capture the invite URL for Klaviyo.
  // notify is controlled by CLERK_INVITE_NOTIFY env var (default: true).
  // Set CLERK_INVITE_NOTIFY=false once Suzanne's Klaviyo welcome flow is live
  // and confirmed to be delivering the invite link — at that point Clerk's own
  // email becomes redundant and should be disabled to avoid duplicate sends.
  let inviteUrl: string | undefined;
  try {
    const client = await clerkClient();
    const notifyClerk = process.env.CLERK_INVITE_NOTIFY !== 'false';
    const invitation = await client.invitations.createInvitation({
      emailAddress: customerEmail,
      notify: notifyClerk,
      ignoreExisting: true,
      publicMetadata: {
        role: 'PARENT',
        createdByShopify: true,
        orderId: dbOrder.id,
        shopifyOrderId,
        shopifyOrderNumber,
      },
      redirectUrl: process.env.NEXT_PUBLIC_CLERK_INVITATION_REDIRECT_URL,
    });
    inviteUrl = invitation.url;
    log.info('Clerk invitation created', { email: customerEmail, orderId: dbOrder.id, notifyClerk, hasUrl: !!inviteUrl });
  } catch (clerkError: any) {
    const code = clerkError?.errors?.[0]?.code;
    if (code === 'duplicate_record') {
      log.info('Clerk invitation already exists, skipping', { email: customerEmail });
    } else {
      log.error('Failed to create Clerk invitation', {
        email: customerEmail,
        error: clerkError?.message,
        code,
      });
    }
  }

  // Audit log
  await prisma.auditLog.create({
    data: {
      orderId: dbOrder.id,
      action: 'ORDER_CREATED_FROM_SHOPIFY',
      userId: user.id,
      userEmail: customerEmail,
      details: {
        shopifyOrderId,
        shopifyOrderNumber,
        kitCount,
        isNewUser,
        inviteSent: true,
        inviteUrlCaptured: !!inviteUrl,
      },
    },
  });

  // Klaviyo: Placed Order — starts the post-purchase sequence.
  // invite_url is passed so Suzanne's welcome flow can deliver the portal link.
  await trackPlacedOrder({
    email: customerEmail,
    orderId: dbOrder.id,
    orderNumber: dbOrder.orderNumber,
    kitCount,
    shopifyOrderId,
    inviteUrl,
  });
}

// ── Minimal Shopify types ──────────────────────────────────────────────────

interface ShopifyOrder {
  id: number;
  order_number?: number;
  email?: string;
  customer?: {
    email?: string;
    first_name?: string;
    last_name?: string;
    phone?: string;
  };
  billing_address?: {
    first_name?: string;
    last_name?: string;
    address1?: string;
    address2?: string;
    city?: string;
    province?: string;
    province_code?: string;
    zip?: string;
    phone?: string;
  };
  line_items?: Array<{
    title: string;
    quantity: number;
    sku?: string;
  }>;
}

function formatDate(): string {
  const now = new Date();
  const yy = now.getFullYear().toString().slice(-2);
  const mm = (now.getMonth() + 1).toString().padStart(2, '0');
  const dd = now.getDate().toString().padStart(2, '0');
  return `${yy}${mm}${dd}`;
}
