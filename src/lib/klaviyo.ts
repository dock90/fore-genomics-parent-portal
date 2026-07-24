import { ApiKeySession, EventsApi } from 'klaviyo-api';
import { createLogger } from '@/lib/logger';

const log = createLogger('Klaviyo');

function getSession(): ApiKeySession {
  const key = process.env.KLAVIYO_PRIVATE_API_KEY;
  if (!key) throw new Error('KLAVIYO_PRIVATE_API_KEY is not set');
  return new ApiKeySession(key);
}

// ── Event helpers ─────────────────────────────────────────────────────────────

async function track(
  eventName: string,
  email: string,
  properties: Record<string, unknown> = {},
  uniqueId?: string
) {
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
          // Optional idempotency key — repeated events with the same unique_id for a
          // profile+metric are recorded once (prevents double-enrollment when the
          // FedEx poll re-observes a "Delivered" scan).
          ...(uniqueId ? { uniqueId } : {}),
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
 * Fired when a Health Hub invite is created in Clerk.
 * Triggers the 6-hour reminder flow in Klaviyo if the parent hasn't signed up.
 */
export async function trackInviteSent(params: {
  email: string;
  orderId?: string;
  orderNumber?: string;
  inviteUrl?: string;
}) {
  await track('Invite Sent', params.email, {
    order_id: params.orderId ?? null,
    order_number: params.orderNumber ?? null,
    invite_url: params.inviteUrl ?? null,
  });
}

/**
 * Fired when a parent creates their Health Hub account (Clerk user.created).
 * Stops the invite reminder flow in Klaviyo.
 */
export async function trackAccountCreated(params: {
  email: string;
}) {
  await track('Account Created', params.email, {});
}

/**
 * Fired when a parent creates their Health Hub account (Clerk user.created),
 * signalling that they still need to add their child's info to complete enrollment.
 * Use this as the trigger for the "finish adding your child" nudge flow — the
 * flow should watch for `Onboarding Completed` (fired from the onboarding save
 * step) as the exit/goal event once they actually fill it in.
 */
export async function trackEnrollmentPending(params: {
  email: string;
}) {
  await track('Enrollment Pending', params.email, {});
}

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
  inviteUrl?: string;
}) {
  await track('Placed Order', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
    kit_count: params.kitCount,
    shopify_order_id: params.shopifyOrderId ?? null,
    invite_url: params.inviteUrl ?? null,
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
 * Fired when admin marks an order as Delivered — Awaiting Return.
 * Triggers the return-reminder cadence prompting the parent to send the kit back.
 */
export async function trackKitDelivered(params: {
  email: string;
  orderId: string;
  orderNumber: string;
}) {
  await track('Kit Delivered', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
  });
}

/**
 * Fired when admin marks an order as Shipped to Lab — the sample is in transit.
 * Triggers the "your child's sample is on its way to the lab" email.
 * Carries the inbound (return) tracking number + prebuilt FedEx URL so the
 * email can render a live "track the return" link via
 * {{ event.inbound_tracking_number }} / {{ event.inbound_tracking_url }}.
 */
export async function trackSampleShipped(params: {
  email: string;
  orderId: string;
  orderNumber: string;
  inboundTracking?: string | null;
}) {
  await track('Sample Shipped', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
    inbound_tracking_number: params.inboundTracking ?? null,
    inbound_tracking_url: params.inboundTracking
      ? `https://www.fedex.com/fedextrack/?trknbr=${params.inboundTracking}`
      : null,
  });
}

/**
 * Fired when admin marks an order as Received / In Process at the lab.
 * Triggers the educational nurture sequence during the ~2–3 week sequencing wait.
 */
export async function trackSampleReady(params: {
  email: string;
  orderId: string;
  orderNumber: string;
}) {
  await track('Sample Ready', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
  });
}

/**
 * Dedicated trigger for the Sample Submission Nudge Flow — OUTBOUND kit delivered
 * to the customer (status → Delivered — Awaiting Return). ENTERS the nudge flow.
 * Idempotent via unique_id so a repeated FedEx "Delivered" scan won't re-enroll.
 */
export async function trackKitDeliveredToCustomer(params: {
  email: string;
  orderId: string;
  orderNumber: string;
  outboundTracking?: string | null;
  inboundTracking?: string | null;
  status?: string | null;
}) {
  await track(
    'Kit Delivered to Customer',
    params.email,
    {
      order_id: params.orderId,
      order_number: params.orderNumber,
      carrier: 'FedEx',
      leg: 'outbound',
      outbound_tracking_number: params.outboundTracking ?? null,
      inbound_tracking_number: params.inboundTracking ?? null,
      outbound_tracking_url: params.outboundTracking
        ? `https://www.fedex.com/fedextrack/?trknbr=${params.outboundTracking}`
        : null,
      inbound_tracking_url: params.inboundTracking
        ? `https://www.fedex.com/fedextrack/?trknbr=${params.inboundTracking}`
        : null,
      status: params.status ?? null,
    },
    `${params.orderId}:kit-delivered-to-customer`
  );
}

/**
 * Dedicated exit for the Sample Submission Nudge Flow — INBOUND kit delivered back
 * to the lab (status → Received / In Process). EXITS the nudge flow.
 * Idempotent via unique_id.
 */
export async function trackKitDeliveredToLab(params: {
  email: string;
  orderId: string;
  orderNumber: string;
  outboundTracking?: string | null;
  inboundTracking?: string | null;
  status?: string | null;
}) {
  await track(
    'Kit Delivered to Lab',
    params.email,
    {
      order_id: params.orderId,
      order_number: params.orderNumber,
      carrier: 'FedEx',
      leg: 'inbound',
      outbound_tracking_number: params.outboundTracking ?? null,
      inbound_tracking_number: params.inboundTracking ?? null,
      outbound_tracking_url: params.outboundTracking
        ? `https://www.fedex.com/fedextrack/?trknbr=${params.outboundTracking}`
        : null,
      inbound_tracking_url: params.inboundTracking
        ? `https://www.fedex.com/fedextrack/?trknbr=${params.inboundTracking}`
        : null,
      status: params.status ?? null,
    },
    `${params.orderId}:kit-delivered-to-lab`
  );
}

/**
 * Fired when admin marks an order as Resample Required.
 */
export async function trackResampleReady(params: {
  email: string;
  orderId: string;
  orderNumber: string;
  childName?: string;
}) {
  await track('Resample Ready', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
    child_name: params.childName ?? null,
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
  /** True for COMPLETE_COUNSELING_REQUIRED — lets Klaviyo route positive cases
   *  away from the generic "results are ready!" email via a trigger filter. */
  counselingRequired?: boolean;
}) {
  await track('Results Ready', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
    child_name: params.childName ?? null,
    counseling_required: params.counselingRequired ?? false,
  });
}

/**
 * Fired when a parent actually opens their child's interactive results in Fore
 * Explore. The Explore app loads the genome via GET /api/explore/genome, and that
 * successful, consent-gated fetch is the "viewed" signal — distinct from
 * `Results Ready` (the report merely became available).
 *
 * Use this in Klaviyo to stop "have you looked at your results yet?" nudges once a
 * parent has engaged, or to branch flows on viewed vs. not-yet-viewed families
 * (e.g. Results Ready → wait N days → if no Results Viewed, send a reminder).
 */
export async function trackResultsViewed(params: {
  email: string;
  orderId: string;
  orderNumber: string;
  childName?: string | null;
  kitNumber?: string | number | null;
}) {
  await track('Results Viewed', params.email, {
    order_id: params.orderId,
    order_number: params.orderNumber,
    child_name: params.childName ?? null,
    kit_number: params.kitNumber ?? null,
    source: 'explore',
  });
}
