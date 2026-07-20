import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { applyEvents, applyOptionsFromEnv } from '@/lib/fedex/apply';
import { trackByNumbers } from '@/lib/fedex/client';
import { listOpenOrders } from '@/lib/fedex/store';
import { STATUS_PIPELINE, type OrderShippingRecord } from '@/lib/fedex/types';
import { createLogger } from '@/lib/logger';
import type { OrderStatus } from '@prisma/client';

const log = createLogger('FedexPollCron');

export const dynamic = 'force-dynamic';
export const maxDuration = 30;

/**
 * /api/public/cron/fedex-poll — FedEx Track API poller.
 *
 * Runs every 30 minutes via Vercel Cron (see vercel.json). Polls every open
 * order's tracking numbers (batched 30/request) and applies the same status
 * rules as the webhook. This works with only Fore's own FedEx developer keys
 * — no Inocras involvement — and stays on as a safety net for missed webhook
 * pushes once the webhook is live.
 *
 * Secured with CRON_SECRET bearer token (same as the other cron routes).
 * NOTE: Vercel Cron invokes with GET; POST kept for manual/legacy triggers.
 *
 * Poll scope per order (skips finished legs to keep request volume tiny):
 *   outbound number — until the order reaches DELIVERED_AWAITING_RETURN
 *   inbound number  — until the order reaches RECEIVED_IN_PROCESS
 */
const rank = (s: OrderStatus) => STATUS_PIPELINE.indexOf(s);
const OUTBOUND_DONE = rank('DELIVERED_AWAITING_RETURN');
const INBOUND_DONE = rank('RECEIVED_IN_PROCESS');

function numbersToPoll(order: OrderShippingRecord): string[] {
	const r = rank(order.status);
	if (r < 0) return []; // manual/terminal status — leave it alone
	const numbers: string[] = [];
	if (order.outboundTrackingNumber && r < OUTBOUND_DONE) {
		numbers.push(order.outboundTrackingNumber);
	}
	if (order.inboundTrackingNumber && r < INBOUND_DONE) {
		numbers.push(order.inboundTrackingNumber);
	}
	return numbers;
}

function authorized(req: NextRequest): boolean {
	const secret = process.env.CRON_SECRET;
	if (!secret) return false; // fail closed
	const got = req.headers.get('authorization') ?? '';
	const expected = `Bearer ${secret}`;
	const a = Buffer.from(got);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

async function run(req: NextRequest) {
	if (!authorized(req)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	const orders = await listOpenOrders(300);
	const trackingNumbers = orders.flatMap(numbersToPoll);

	if (trackingNumbers.length === 0) {
		return NextResponse.json({ orders: orders.length, polled: 0, advanced: 0 });
	}

	const events = await trackByNumbers(trackingNumbers);
	const results = await applyEvents(events, applyOptionsFromEnv());

	const advanced = results.filter((r) => r.action === 'advanced');
	for (const a of advanced) {
		if (a.action === 'advanced') {
			log.info('Advanced order from poll', {
				orderId: a.orderId,
				from: a.from,
				to: a.to,
			});
		}
	}
	return NextResponse.json({
		orders: orders.length,
		polled: trackingNumbers.length,
		events: events.length,
		advanced: advanced.length,
	});
}

export async function GET(req: NextRequest) {
	return run(req);
}

export async function POST(req: NextRequest) {
	return run(req);
}
