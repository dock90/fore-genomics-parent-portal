/**
 * FedEx code → order-status mapping, plus tolerant payload normalizers for
 * both the AIV webhook (push) and the Track API (poll).
 */
import type { OrderStatus } from '@prisma/client';
import {
	STATUS_PIPELINE,
	type Direction,
	type EventKind,
	type NormalizedEvent,
} from './types';

/**
 * FedEx scan/derived codes we recognize. Anything not listed maps to UNKNOWN,
 * which never changes a status — it only lands in the FedexTrackingEvent log.
 * Extend from observed payloads (see FEDEX_TRACKING.md).
 */
const CODE_KIND: Record<string, EventKind> = {
	// Label / pre-transit
	OC: 'LABEL_CREATED', // shipment information sent to FedEx
	IN: 'LABEL_CREATED', // "initiated" (Track API derivedCode)
	// Movement
	PU: 'MOVEMENT', // picked up
	DP: 'MOVEMENT', // departed FedEx location
	AR: 'MOVEMENT', // arrived at FedEx location
	AF: 'MOVEMENT', // at local FedEx facility
	IT: 'MOVEMENT', // in transit
	OD: 'MOVEMENT', // out for delivery
	CC: 'MOVEMENT', // international clearance complete
	HL: 'MOVEMENT', // hold at location
	// Delivered
	DL: 'DELIVERED',
	// Exceptions — never advance a status; surfaced for ops follow-up
	DE: 'EXCEPTION', // delivery exception
	SE: 'EXCEPTION', // shipment exception
	DY: 'EXCEPTION', // delay
	CD: 'EXCEPTION', // clearance delay
	CA: 'EXCEPTION', // shipment canceled
	RS: 'EXCEPTION', // return to shipper
	RT: 'EXCEPTION', // return to shipper
};

export function kindForCode(code: string | undefined | null): EventKind {
	if (!code) return 'UNKNOWN';
	return CODE_KIND[code.toUpperCase()] ?? 'UNKNOWN';
}

/** Status a normalized event implies, given which leg the tracking number belongs to. */
export function targetStatus(
	direction: Direction,
	kind: EventKind,
	advanceOnLabDelivery: boolean
): OrderStatus | null {
	if (direction === 'OUTBOUND') {
		if (kind === 'MOVEMENT') return 'SHIPPED_TO_USER';
		if (kind === 'DELIVERED') return 'DELIVERED_AWAITING_RETURN';
		return null;
	}
	// INBOUND leg (family → lab)
	if (kind === 'MOVEMENT') return 'SHIPPED_TO_LAB';
	if (kind === 'DELIVERED')
		return advanceOnLabDelivery ? 'RECEIVED_IN_PROCESS' : null;
	return null;
}

const rank = (s: OrderStatus): number => STATUS_PIPELINE.indexOf(s);

/**
 * FedEx automation only ever moves an order FORWARD along the linear pipeline.
 * Manual/terminal statuses (RESAMPLE_REQUIRED, COMPLETE_COUNSELING_REQUIRED,
 * COMPLETE_NO_COUNSELING_REQUIRED, ORDER_CANCELED) are never touched, and we
 * never regress — late or out-of-order scans are common.
 */
export function canAutoAdvance(from: OrderStatus, to: OrderStatus): boolean {
	const fromRank = rank(from);
	if (fromRank < 0) return false; // manual/terminal status — hands off
	return rank(to) > fromRank;
}

/** Case/whitespace-insensitive tracking number comparison. */
export const normalizeTrackingNumber = (tn: string): string =>
	tn.replace(/\s+/g, '').toUpperCase();

/* ------------------------------------------------------------------ */
/* Webhook payload → NormalizedEvent[]                                 */
/* ------------------------------------------------------------------ */

const TRACKING_KEYS = ['trackingNumber', 'masterTrackingNumber', 'trackingNbr'];
const CODE_KEYS = [
	'eventCode',
	'eventType',
	'derivedCode',
	'derivedStatusCode',
	'statusCode',
	'code',
];
const DESC_KEYS = [
	'eventDescription',
	'statusDescription',
	'description',
	'statusByLocale',
	'derivedStatus',
];
const DATE_KEYS = ['eventDateTime', 'eventDate', 'timestamp', 'date', 'dateTime'];

const isObj = (v: unknown): v is Record<string, unknown> =>
	typeof v === 'object' && v !== null && !Array.isArray(v);

function firstString(
	o: Record<string, unknown>,
	keys: string[]
): string | undefined {
	for (const k of keys) {
		const v = o[k];
		if (typeof v === 'string' && v.trim()) return v.trim();
	}
	return undefined;
}

function parseDate(v: string | undefined): Date | undefined {
	if (!v) return undefined;
	const d = new Date(v);
	return isNaN(d.getTime()) ? undefined : d;
}

/**
 * FedEx AIV webhook payloads nest scan events under varying envelopes, and
 * FedEx has revised the schema between versions. Rather than pin one shape,
 * walk the payload: any object carrying an event code becomes an event, and
 * the tracking number is inherited from the nearest enclosing object that has
 * one. Finalize against the sample payload FedEx shows during webhook
 * creation — unknown shapes fail safe into the audit log.
 */
export function extractEventsFromWebhook(payload: unknown): NormalizedEvent[] {
	const events: NormalizedEvent[] = [];
	const walk = (node: unknown, inheritedTracking: string | undefined): void => {
		if (Array.isArray(node)) {
			for (const item of node) walk(item, inheritedTracking);
			return;
		}
		if (!isObj(node)) return;

		// trackingNumber may live on this object directly, or under trackingNumberInfo
		let tracking = firstString(node, TRACKING_KEYS) ?? inheritedTracking;
		const tni = node['trackingNumberInfo'];
		if (isObj(tni)) tracking = firstString(tni, TRACKING_KEYS) ?? tracking;

		const code = firstString(node, CODE_KEYS);
		if (code && tracking) {
			events.push({
				trackingNumber: normalizeTrackingNumber(tracking),
				kind: kindForCode(code),
				code: code.toUpperCase(),
				description: firstString(node, DESC_KEYS),
				occurredAt: parseDate(firstString(node, DATE_KEYS)),
				source: 'webhook',
				raw: node,
			});
			// An event object can still contain nested envelopes; keep walking.
		}
		for (const v of Object.values(node)) walk(v, tracking);
	};
	walk(payload, undefined);

	// De-dupe identical (trackingNumber, code, occurredAt) triples from nested walks.
	const seen = new Set<string>();
	return events.filter((e) => {
		const key = `${e.trackingNumber}|${e.code}|${e.occurredAt?.toISOString() ?? ''}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

/* ------------------------------------------------------------------ */
/* Track API (poll) response → NormalizedEvent[]                       */
/* ------------------------------------------------------------------ */

interface TrackApiResponse {
	output?: {
		completeTrackResults?: Array<{
			trackingNumber?: string;
			trackResults?: Array<Record<string, unknown>>;
		}>;
	};
}

/** Latest-status event per tracking number from a Track API response. */
export function extractEventsFromTrackResponse(
	body: unknown
): NormalizedEvent[] {
	const events: NormalizedEvent[] = [];
	const results = (body as TrackApiResponse)?.output?.completeTrackResults ?? [];
	for (const result of results) {
		const tn = result.trackingNumber;
		const tr = result.trackResults?.[0];
		if (!tn || !isObj(tr)) continue;
		if (isObj(tr['error'])) continue; // e.g. tracking number not found yet

		const latest = tr['latestStatusDetail'];
		let code: string | undefined;
		let description: string | undefined;
		if (isObj(latest)) {
			code = firstString(latest, ['derivedCode', 'code']);
			description = firstString(latest, ['statusByLocale', 'description']);
		}
		// Timestamp: prefer actual delivery, else the most recent scan event.
		let occurredAt: Date | undefined;
		const dat = tr['dateAndTimes'];
		if (Array.isArray(dat)) {
			const actual = dat.find((d) => isObj(d) && d['type'] === 'ACTUAL_DELIVERY');
			if (isObj(actual)) occurredAt = parseDate(firstString(actual, ['dateTime']));
		}
		const scans = tr['scanEvents'];
		if (!occurredAt && Array.isArray(scans) && isObj(scans[0])) {
			occurredAt = parseDate(firstString(scans[0], ['date', 'dateTime']));
		}
		if (!code) continue;
		events.push({
			trackingNumber: normalizeTrackingNumber(tn),
			kind: kindForCode(code),
			code: code.toUpperCase(),
			description,
			occurredAt,
			source: 'poll',
			raw: latest ?? tr,
		});
	}
	return events;
}
