import { ApiKeySession, EventsApi } from 'klaviyo-api';
import { createLogger } from '@/lib/logger';

const log = createLogger('Klaviyo');

function getSession(): ApiKeySession {
  const key = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!key) throw new Error('KLAVIYO_PRIVATE_API_KEY is not set');
  return new ApiKeySession(key);
}

// ── Event helpers ─────────────────────────────────────────────────────────────

async function track(eventName: string, email: string, properties: Record<string, unknown> = {}) {
  try {
    const session = getSession();
    const eventsApi = new EventsApi(session);

    await eventsApi.createEvent({
      data: {
        type: 'event',
        attributes: {
          metric: { data: { type: 'metric', attributes: { name: eventName } } },
          profile: { data: { type: 'profile', attributes: { email } } },
          properties,
          time: new Date(),
        },
      },
    });

    log.info(`Event tracked: ${eventName}`, { email });
  } catch (err: any) {
    log.error(`Failed to track event: ${eventName}`, { email, error: err?.message });
    // Never throw — Klaviyo failures must not break the main flow
  }
}

// ── Public events ─────────────────────────────────────────────────────────────

/**
 * Fired when a Shopify order is paid.
 * Triggers the post-purchase invite + time-delay kit sequence in Klaviyo.
 */
export async function trackPlacedOrder(params: {
  email: string;
  orderId: string;
  orderNumber: string;
  kitCount: number;
  shopifyOrderId?: string;
}) {
  await track('Placed Order', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
    kit_count: params.kitCount,
    shopify_order_id: params.shopifyOrderId ?? null,
    source: 'shopify',
  });
}

/**
 * Fired when a parent completes the Health Hub onboarding flow.
 * Triggers the "kit is being prepared" sequence and stops the invite reminder sequence.
 */
export async function trackOnboardingCompleted(params: {
  email: string;
  orderId: string;
  orderNumber: string;
}) {
  await track('Onboarding Completed', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
  });
}

/**
 * Fired when admin marks an order as shipped.
 * Triggers the time-delay "check your mailbox" sequence.
 */
export async function trackKitShipped(params: {
  email: string;
  orderId: string;
  orderNumber: string;
  trackingNumber?: string;
}) {
  await track('Kit Shipped', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
    tracking_number: params.trackingNumber ?? null,
  });
}

/**
 * Fired when a genomic report is uploaded and ready for the parent to view.
 */
export async function trackResultsReady(params: {
  email: string;
  orderId: string;
  orderNumber: string;
  childName?: string;
}) {
  await track('Results Ready', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
    child_name: params.childName ?? null,
  });
}
