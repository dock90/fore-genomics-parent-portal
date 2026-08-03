import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('AcuityWebhook');

export const dynamic = 'force-dynamic';

/**
 * Genetic-counseling bookings from Acuity Scheduling.
 *
 * Counseling is delivered by Grey Genetics, who book on their own Acuity account
 * (the results email links to greygenetics.as.me). Without this endpoint a booking
 * never reaches us: the order's counseling date stays null, the parent's dashboard
 * never shows their appointment and keeps prompting them to book one they already
 * have, and nobody in admin can tell who is scheduled.
 *
 * Two payload shapes are accepted, because which one we get depends on what Grey
 * is willing to set up:
 *
 *  A. ENRICHED JSON (preferred — no credential sharing).
 *     Grey sends us the fields directly, e.g. from Zapier/Make or their own hook:
 *       { "action": "scheduled", "email": "...", "datetime": "2026-08-04T15:00:00-07:00",
 *         "appointmentType": "Fore Genomics — Results Review", "id": "123456" }
 *     Authenticated with a shared secret we give them.
 *
 *  B. NATIVE ACUITY WEBHOOK.
 *     Acuity posts form-encoded `action` + `id` + `appointmentTypeID` and NOTHING
 *     else — the appointment details have to be fetched back from their API, which
 *     needs Grey's own Acuity credentials in ACUITY_USER_ID / ACUITY_API_KEY. Only
 *     works if they are willing to share a key.
 *
 * Always returns 200 once the request is authenticated. Acuity retries on non-2xx,
 * and a booking we cannot match to an order is not a failure worth retrying — it is
 * logged for a human instead.
 */

type Normalized = {
	action: string;
	email: string;
	datetime: string;
	appointmentType: string;
	appointmentId: string;
};

/** Timing-safe compare so the shared secret can't be probed byte by byte. */
function secretMatches(provided: string | null, expected: string): boolean {
	if (!provided) return false;
	const a = Buffer.from(provided);
	const b = Buffer.from(expected);
	return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Acuity signs the raw body: base64(HMAC-SHA256(body, apiKey)) in X-Acuity-Signature. */
function acuitySignatureValid(rawBody: string, header: string | null): boolean {
	const key = process.env.ACUITY_API_KEY;
	if (!key || !header) return false;
	const expected = crypto.createHmac('sha256', key).update(rawBody).digest('base64');
	const a = Buffer.from(header);
	const b = Buffer.from(expected);
	return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/** Fetch the details Acuity's own webhook leaves out. Requires Grey's credentials. */
async function fetchAppointment(id: string): Promise<Normalized | null> {
	const user = process.env.ACUITY_USER_ID;
	const key = process.env.ACUITY_API_KEY;
	if (!user || !key) return null;

	const auth = Buffer.from(`${user}:${key}`).toString('base64');
	const res = await fetch(`https://acuityscheduling.com/api/v1/appointments/${id}`, {
		headers: { Authorization: `Basic ${auth}` },
		cache: 'no-store',
	});
	if (!res.ok) {
		log.error('Acuity appointment lookup failed', { id, status: res.status });
		return null;
	}
	const a = await res.json();
	return {
		action: '',
		email: a?.email ?? '',
		datetime: a?.datetime ?? '',
		appointmentType: a?.type ?? a?.appointmentType ?? '',
		appointmentId: String(a?.id ?? id),
	};
}

/**
 * Pre-test or post-test, from the appointment type name.
 *
 * Defaults to POST-test: the link we actually send families is the results review
 * ("ForeGenomics-1stappt-results"), so an unrecognised type is far more likely to be
 * a results appointment than a pre-test one.
 */
function isPreTest(appointmentType: string): boolean {
	const t = appointmentType.toLowerCase();
	if (/\b(result|post[- ]?test|post[- ]?report)\b/.test(t)) return false;
	return /\b(pre[- ]?test|pre[- ]?screen|initial consult)\b/.test(t);
}

export async function POST(request: NextRequest) {
	const raw = await request.text();
	const contentType = request.headers.get('content-type') ?? '';

	let payload: Normalized | null = null;

	// ---- Shape A: enriched JSON behind a shared secret ----------------------
	if (contentType.includes('application/json')) {
		const secret = process.env.ACUITY_WEBHOOK_SECRET;
		if (!secret) {
			log.error('Enriched Acuity payload received but ACUITY_WEBHOOK_SECRET is not set');
			return NextResponse.json({ error: 'not configured' }, { status: 503 });
		}
		const provided =
			request.headers.get('x-fore-webhook-secret') ??
			request.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ??
			null;
		if (!secretMatches(provided, secret)) {
			return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
		}
		try {
			const j = JSON.parse(raw);
			payload = {
				action: String(j.action ?? '').toLowerCase(),
				email: String(j.email ?? ''),
				datetime: String(j.datetime ?? j.start_time ?? ''),
				appointmentType: String(j.appointmentType ?? j.type ?? ''),
				appointmentId: String(j.id ?? j.appointmentId ?? ''),
			};
		} catch {
			return NextResponse.json({ error: 'invalid json' }, { status: 400 });
		}
	}
	// ---- Shape B: native Acuity form post ----------------------------------
	else {
		if (!acuitySignatureValid(raw, request.headers.get('x-acuity-signature'))) {
			return NextResponse.json({ error: 'bad signature' }, { status: 401 });
		}
		const form = new URLSearchParams(raw);
		const id = form.get('id') ?? '';
		const action = (form.get('action') ?? '').toLowerCase();
		const detail = await fetchAppointment(id);
		if (!detail) {
			// Authenticated, but we cannot enrich — do not make Acuity retry forever.
			log.error(
				'Acuity webhook received but appointment could not be fetched; set ACUITY_USER_ID/ACUITY_API_KEY or ask for an enriched payload',
				{ id, action }
			);
			return NextResponse.json({ received: true, enriched: false });
		}
		payload = { ...detail, action };
	}

	if (!payload?.email || !payload.action) {
		log.warn('Acuity webhook missing email or action', { action: payload?.action });
		return NextResponse.json({ received: true, matched: false });
	}

	const cancelled = /cancel/.test(payload.action);
	const scheduled = /schedul|reschedul|chang/.test(payload.action);
	if (!cancelled && !scheduled) {
		return NextResponse.json({ received: true, ignored: payload.action });
	}

	// ---- Match the booking to an order -------------------------------------
	// Look at orders the person is on in EITHER capacity. The Calendly handler
	// picked one list based on User.role, which silently misses a booking when the
	// same person is the purchaser on one order and the parent on another.
	const user = await prisma.user.findFirst({
		where: { email: payload.email },
		include: { parentOrders: true, purchaserOrders: true },
	});
	if (!user) {
		log.warn('Acuity booking for an unknown email', { appointmentId: payload.appointmentId });
		return NextResponse.json({ received: true, matched: false });
	}

	const orders = [...user.parentOrders, ...user.purchaserOrders].filter(
		(o, i, all) => all.findIndex((x) => x.id === o.id) === i
	);
	if (!orders.length) {
		return NextResponse.json({ received: true, matched: false });
	}

	const preTest = isPreTest(payload.appointmentType);

	// Prefer the order actually waiting on this appointment — for a results review
	// that is the one whose status says counseling is required. Newest order is only
	// a fallback, and would be wrong for a family with more than one order open.
	const awaiting = orders.filter((o) =>
		preTest
			? !o.preTestCounselingDate
			: o.status === 'COMPLETE_COUNSELING_REQUIRED' && !o.postTestCounselingDate
	);
	const target = (awaiting.length ? awaiting : orders).sort(
		(a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
	)[0];

	const data = preTest
		? {
				preTestCounselingDate: cancelled ? null : new Date(payload.datetime),
				preTestCounselingEventId: cancelled ? null : payload.appointmentType,
				preTestCounselingInviteeId: cancelled ? null : payload.appointmentId,
			}
		: {
				postTestCounselingDate: cancelled ? null : new Date(payload.datetime),
				postTestCounselingEventId: cancelled ? null : payload.appointmentType,
				postTestCounselingInviteeId: cancelled ? null : payload.appointmentId,
			};

	await prisma.order.update({ where: { id: target.id }, data });

	try {
		const { AuditService } = await import('@/lib/audit-service');
		await AuditService.logAction({
			orderId: target.id,
			action: 'STATUS_CHANGE',
			userId: '',
			userEmail: payload.email,
			details: {
				source: 'acuity-webhook',
				acuityAction: payload.action,
				appointmentType: payload.appointmentType,
				appointmentId: payload.appointmentId,
				counseling: preTest ? 'pre-test' : 'post-test',
				scheduledFor: cancelled ? null : payload.datetime,
			},
		});
	} catch {
		/* audit is best-effort */
	}

	log.info(cancelled ? 'Counseling booking canceled' : 'Counseling booking recorded', {
		orderNumber: target.orderNumber,
		counseling: preTest ? 'pre-test' : 'post-test',
	});

	return NextResponse.json({ received: true, matched: true });
}
