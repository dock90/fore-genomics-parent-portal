import { timingSafeEqual } from 'node:crypto';
import { NextRequest, NextResponse } from 'next/server';
import { applyEvents, applyOptionsFromEnv } from '@/lib/fedex/apply';
import { extractEventsFromWebhook } from '@/lib/fedex/mapping';
import { createLogger } from '@/lib/logger';

const log = createLogger('FedexWebhook');

export const dynamic = 'force-dynamic';

/**
 * POST /api/webhooks/fedex — receiver for FedEx Advanced Integrated Visibility.
 *
 * FedEx (via the subscription on Inocras's account — see FEDEX_TRACKING.md)
 * POSTs near-real-time scan events here. Auth is a shared token configured on
 * the webhook at creation time, sent on every request in a header.
 *
 * Env:
 *   FEDEX_WEBHOOK_TOKEN         shared secret (generate: openssl rand -hex 32)
 *   FEDEX_WEBHOOK_TOKEN_HEADER  header FedEx sends it in (default "x-webhook-token";
 *                               confirm the exact header during webhook creation)
 */
function tokenOk(req: NextRequest): boolean {
	const expected = process.env.FEDEX_WEBHOOK_TOKEN;
	if (!expected) return false; // fail closed until configured
	const headerName = process.env.FEDEX_WEBHOOK_TOKEN_HEADER || 'x-webhook-token';
	const got =
		req.headers.get(headerName) ??
		req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
		'';
	const a = Buffer.from(got);
	const b = Buffer.from(expected);
	return a.length === b.length && timingSafeEqual(a, b);
}

export async function POST(req: NextRequest) {
	if (!tokenOk(req)) {
		return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
	}

	let payload: unknown;
	try {
		payload = await req.json();
	} catch {
		return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const events = extractEventsFromWebhook(payload);
	if (events.length === 0) {
		// Unknown envelope — log the shape so the parser can be extended, but 200
		// so FedEx doesn't burn its 3 retries on a payload we've already captured.
		log.warn('Webhook payload yielded no events', {
			payload: JSON.stringify(payload).slice(0, 2000),
		});
		return NextResponse.json({ received: 0 });
	}

	// Respond fast; FedEx retries on non-2xx/timeout. Work is small (a few DB
	// writes) so we do it inline — move to a queue if volume ever demands it.
	const results = await applyEvents(events, applyOptionsFromEnv());

	const advanced = results.filter((r) => r.action === 'advanced').length;
	const unmatched = results.filter((r) => r.action === 'unmatched').length;
	log.info('Processed FedEx webhook', {
		received: events.length,
		advanced,
		unmatched,
	});
	return NextResponse.json({ received: events.length, advanced, unmatched });
}
