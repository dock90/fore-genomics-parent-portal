/**
 * Core rule engine: take a normalized FedEx event, find the order, decide the
 * status change, apply it through the shared order-status service. Used
 * identically by the webhook route (push) and the cron route (poll) — so
 * switching data sources never changes behavior.
 */
import { createLogger } from '@/lib/logger';
import { canAutoAdvance, normalizeTrackingNumber, targetStatus } from './mapping';
import { findOrderByTrackingNumber, recordFedexEvent, advanceOrderStatus } from './store';
import type {
	ApplyOptions,
	ApplyResult,
	Direction,
	NormalizedEvent,
	OrderShippingRecord,
} from './types';

const log = createLogger('FedexApply');

export function applyOptionsFromEnv(): ApplyOptions {
	return {
		advanceOnLabDelivery:
			(process.env.FEDEX_ADVANCE_ON_LAB_DELIVERY ?? 'true').toLowerCase() !==
			'false',
	};
}

function directionFor(
	order: OrderShippingRecord,
	trackingNumber: string
): Direction | null {
	const tn = normalizeTrackingNumber(trackingNumber);
	if (
		order.outboundTrackingNumber &&
		normalizeTrackingNumber(order.outboundTrackingNumber) === tn
	) {
		return 'OUTBOUND';
	}
	if (
		order.inboundTrackingNumber &&
		normalizeTrackingNumber(order.inboundTrackingNumber) === tn
	) {
		return 'INBOUND';
	}
	return null;
}

export async function applyEvent(
	evt: NormalizedEvent,
	opts: ApplyOptions
): Promise<ApplyResult> {
	const order = await findOrderByTrackingNumber(evt.trackingNumber);
	if (!order) {
		// Not one of ours (or the tracking number was never recorded). Keep it in
		// the audit log — with an account-level webhook on Inocras's account,
		// their other traffic lands here and that's expected.
		await recordFedexEvent(null, null, evt);
		return { action: 'unmatched', trackingNumber: evt.trackingNumber };
	}

	const direction = directionFor(order, evt.trackingNumber);
	await recordFedexEvent(order.orderId, direction, evt);

	if (evt.kind === 'EXCEPTION') {
		// Never advances a status — recordFedexEvent already posted the ops alert.
		return { action: 'logged', orderId: order.orderId };
	}

	if (!direction) {
		log.warn('Order matched but no direction — data bug?', {
			orderId: order.orderId,
			trackingNumber: evt.trackingNumber,
		});
		return { action: 'skipped', orderId: order.orderId, reason: 'no-direction' };
	}

	const to = targetStatus(direction, evt.kind, opts.advanceOnLabDelivery);
	if (!to) return { action: 'logged', orderId: order.orderId };

	const from = order.status;
	if (!canAutoAdvance(from, to)) {
		return { action: 'skipped', orderId: order.orderId, reason: `${from} → ${to}` };
	}

	await advanceOrderStatus(order.orderId, from, to, direction, evt);
	return { action: 'advanced', orderId: order.orderId, from, to };
}

export async function applyEvents(
	events: NormalizedEvent[],
	opts: ApplyOptions
): Promise<ApplyResult[]> {
	const results: ApplyResult[] = [];
	for (const evt of events) {
		try {
			results.push(await applyEvent(evt, opts));
		} catch (err) {
			log.error('applyEvent failed', {
				trackingNumber: evt.trackingNumber,
				error: err instanceof Error ? err.message : String(err),
			});
		}
	}
	return results;
}
