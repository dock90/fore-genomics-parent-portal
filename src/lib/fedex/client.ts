/**
 * Minimal FedEx REST client: OAuth token (cached per lambda instance) + batch
 * tracking. Uses Fore's OWN FedEx developer credentials — Inocras's account is
 * not needed for polling; tracking numbers are trackable by whoever holds them.
 *
 * Env:
 *   FEDEX_API_URL    https://apis-sandbox.fedex.com (test) | https://apis.fedex.com (prod)
 *   FEDEX_API_KEY    from the Developer Portal project
 *   FEDEX_SECRET_KEY from the Developer Portal project
 */
import { createLogger } from '@/lib/logger';
import { extractEventsFromTrackResponse } from './mapping';
import type { NormalizedEvent } from './types';

const log = createLogger('FedexClient');

const BASE = () => process.env.FEDEX_API_URL || 'https://apis.fedex.com';

/** Track API accepts at most 30 tracking numbers per request. */
const BATCH_SIZE = 30;

let cachedToken: { token: string; expiresAt: number } | null = null;

export async function getFedexToken(): Promise<string> {
	if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) {
		return cachedToken.token;
	}
	const key = process.env.FEDEX_API_KEY;
	const secret = process.env.FEDEX_SECRET_KEY;
	if (!key || !secret) {
		throw new Error('FEDEX_API_KEY / FEDEX_SECRET_KEY are not set');
	}
	const res = await fetch(`${BASE()}/oauth/token`, {
		method: 'POST',
		headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
		body: new URLSearchParams({
			grant_type: 'client_credentials',
			client_id: key,
			client_secret: secret,
		}),
	});
	if (!res.ok) {
		throw new Error(`FedEx OAuth failed: ${res.status} ${await res.text()}`);
	}
	const json = (await res.json()) as { access_token: string; expires_in: number };
	cachedToken = {
		token: json.access_token,
		expiresAt: Date.now() + json.expires_in * 1000,
	};
	return cachedToken.token;
}

/** Poll current status for a set of tracking numbers (auto-chunked to 30/request). */
export async function trackByNumbers(
	trackingNumbers: string[]
): Promise<NormalizedEvent[]> {
	const unique = Array.from(new Set(trackingNumbers.filter(Boolean)));
	if (unique.length === 0) return [];
	const token = await getFedexToken();
	const events: NormalizedEvent[] = [];

	for (let i = 0; i < unique.length; i += BATCH_SIZE) {
		const chunk = unique.slice(i, i + BATCH_SIZE);
		const res = await fetch(`${BASE()}/track/v1/trackingnumbers`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
				Authorization: `Bearer ${token}`,
				'x-locale': 'en_US',
			},
			body: JSON.stringify({
				includeDetailedScans: true,
				trackingInfo: chunk.map((trackingNumber) => ({
					trackingNumberInfo: { trackingNumber },
				})),
			}),
		});
		if (!res.ok) {
			// One bad batch shouldn't kill the run — log and continue.
			log.error('Track batch failed', {
				status: res.status,
				body: (await res.text()).slice(0, 500),
			});
			continue;
		}
		events.push(...extractEventsFromTrackResponse(await res.json()));
	}
	return events;
}
