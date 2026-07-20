/**
 * Prisma-backed persistence for the FedEx rule engine.
 *
 * Status changes go through applyOrderStatusTransition — the same path the
 * admin UI uses — so audit logs, Klaviyo events, the admin notification
 * email, and the Slack post all fire exactly as if an admin moved the order.
 */
import { prisma } from '@/lib/prisma';
import { applyOrderStatusTransition } from '@/lib/order-status-service';
import { postFedexExceptionToSlack, buildAdminOrderUrl } from '@/lib/slack';
import { createLogger } from '@/lib/logger';
import type { OrderStatus, Prisma } from '@prisma/client';
import { normalizeTrackingNumber } from './mapping';
import type { Direction, NormalizedEvent, OrderShippingRecord } from './types';

const log = createLogger('FedexStore');

/** Actor recorded in the audit trail for automated transitions. */
export const FEDEX_ACTOR = {
	userId: 'fedex-automation',
	userEmail: 'fedex-automation@foregenomics.com',
};

/** Statuses whose shipments may still be moving (tracking presence is the real gate). */
const IN_FLIGHT: OrderStatus[] = [
	'ORDER_RECEIVED',
	'ONBOARDING_COMPLETED',
	'PREPARING_ORDER',
	'SHIPPED_TO_USER',
	'DELIVERED_AWAITING_RETURN',
	'SHIPPED_TO_LAB',
];

const toRecord = (o: {
	id: string;
	status: OrderStatus;
	outboundTrackingNumber: string | null;
	inboundTrackingNumber: string | null;
}): OrderShippingRecord => ({
	orderId: o.id,
	status: o.status,
	outboundTrackingNumber: o.outboundTrackingNumber,
	inboundTrackingNumber: o.inboundTrackingNumber,
});

const SHIPPING_SELECT = {
	id: true,
	status: true,
	outboundTrackingNumber: true,
	inboundTrackingNumber: true,
} as const;

export async function findOrderByTrackingNumber(
	trackingNumber: string
): Promise<OrderShippingRecord | null> {
	const tn = normalizeTrackingNumber(trackingNumber);

	// Fast path: exact match (tracking numbers are normally stored clean).
	const exact = await prisma.order.findFirst({
		where: {
			OR: [{ outboundTrackingNumber: tn }, { inboundTrackingNumber: tn }],
		},
		select: SHIPPING_SELECT,
	});
	if (exact) return toRecord(exact);

	// Tolerant path: admin-entered numbers may carry spaces or lowercase; scan
	// in-flight orders and compare normalized. Volume is small (open orders).
	const candidates = await prisma.order.findMany({
		where: {
			status: { in: IN_FLIGHT },
			OR: [
				{ outboundTrackingNumber: { not: null } },
				{ inboundTrackingNumber: { not: null } },
			],
		},
		select: SHIPPING_SELECT,
	});
	const hit = candidates.find(
		(o) =>
			(o.outboundTrackingNumber &&
				normalizeTrackingNumber(o.outboundTrackingNumber) === tn) ||
			(o.inboundTrackingNumber &&
				normalizeTrackingNumber(o.inboundTrackingNumber) === tn)
	);
	return hit ? toRecord(hit) : null;
}

export async function listOpenOrders(limit = 300): Promise<OrderShippingRecord[]> {
	const orders = await prisma.order.findMany({
		where: {
			status: { in: IN_FLIGHT },
			OR: [
				{ outboundTrackingNumber: { not: null } },
				{ inboundTrackingNumber: { not: null } },
			],
		},
		select: SHIPPING_SELECT,
		orderBy: { statusUpdatedAt: 'asc' },
		take: limit,
	});
	return orders.map(toRecord);
}

/**
 * Audit every event we receive — including unmatched tracking numbers
 * (orderId = null); with an account-level webhook, Inocras's non-Fore traffic
 * lands there and is ignored. Also stamps the convenience columns on the
 * order and posts delivery-exception alerts to Slack.
 */
export async function recordFedexEvent(
	orderId: string | null,
	direction: Direction | null,
	evt: NormalizedEvent
): Promise<void> {
	await prisma.fedexTrackingEvent.create({
		data: {
			orderId,
			trackingNumber: evt.trackingNumber,
			direction,
			kind: evt.kind,
			code: evt.code,
			description: evt.description ?? null,
			occurredAt: evt.occurredAt ?? null,
			source: evt.source,
			raw: (evt.raw ?? undefined) as Prisma.InputJsonValue | undefined,
		},
	});

	if (!orderId) return;

	const orderData: Prisma.OrderUpdateInput = {
		lastFedexStatus: `${evt.code}${evt.description ? ` — ${evt.description}` : ''}`,
		lastFedexEventAt: evt.occurredAt ?? new Date(),
	};
	if (evt.kind === 'DELIVERED' && direction === 'OUTBOUND') {
		orderData.outboundDeliveredAt = evt.occurredAt ?? new Date();
	}
	if (evt.kind === 'DELIVERED' && direction === 'INBOUND') {
		orderData.inboundDeliveredAt = evt.occurredAt ?? new Date();
	}
	await prisma.order.update({ where: { id: orderId }, data: orderData });

	if (evt.kind === 'EXCEPTION') {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			select: { orderNumber: true },
		});
		if (order) {
			await postFedexExceptionToSlack({
				orderNumber: order.orderNumber,
				trackingNumber: evt.trackingNumber,
				code: evt.code,
				description: evt.description,
				adminUrl: buildAdminOrderUrl(orderId),
			});
		}
	}
}

/** Advance an order through the shared status service (fires Klaviyo etc.). */
export async function advanceOrderStatus(
	orderId: string,
	from: OrderStatus,
	to: OrderStatus,
	direction: Direction,
	evt: NormalizedEvent
): Promise<void> {
	log.info('Auto-advancing order from FedEx event', { orderId, from, to, code: evt.code });
	await applyOrderStatusTransition({
		orderId,
		status: to,
		actor: FEDEX_ACTOR,
		auditDetails: {
			source: `fedex-${evt.source}`,
			trackingNumber: evt.trackingNumber,
			direction,
			fedexCode: evt.code,
			fedexDescription: evt.description,
			occurredAt: evt.occurredAt?.toISOString(),
		},
	});
}
