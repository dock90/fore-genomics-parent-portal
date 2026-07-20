import { createLogger } from '@/lib/logger';

const log = createLogger('Slack');

const WEBHOOK_URL = process.env.SLACK_ORDERS_WEBHOOK_URL;

/**
 * Posts an order lifecycle event to the Slack #orders channel via an incoming webhook.
 *
 * IMPORTANT — this channel is treated as a NON-PHI surface. Only the order number,
 * pipeline status, kit count, and a deep link to the admin order page are ever sent.
 * Never include patient/child names, DOB, contact info, or any other PHI here unless
 * the Slack workspace is explicitly covered by a BAA.
 *
 * No-ops silently if SLACK_ORDERS_WEBHOOK_URL is not configured, and never throws —
 * Slack delivery must not break order creation or status updates.
 */
export async function postOrderEventToSlack(params: {
	orderNumber: string;
	status: string;
	statusLabel?: string;
	event: 'created' | 'status_changed';
	kitCount?: number;
	adminUrl?: string;
}): Promise<void> {
	if (!WEBHOOK_URL) return;

	try {
		const heading =
			params.event === 'created'
				? ':package: New order created'
				: ':arrows_counterclockwise: Order status updated';

		const lines = [
			`*${heading}*`,
			`*Order:* \`${params.orderNumber}\``,
			`*Status:* ${params.statusLabel ?? params.status}`,
		];
		if (params.kitCount) lines.push(`*Kits:* ${params.kitCount}`);
		if (params.adminUrl) lines.push(`<${params.adminUrl}|Open in admin>`);

		await fetch(WEBHOOK_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: lines.join('\n') }),
		});

		log.info('Posted order event to Slack', {
			orderNumber: params.orderNumber,
			event: params.event,
		});
	} catch (err: any) {
		log.error('Failed to post order event to Slack', { error: err?.message });
		// Never throw — Slack failures must not break the main flow.
	}
}

/** Builds the admin deep link for an order, or undefined if no base URL is set. */
export function buildAdminOrderUrl(orderId: string): string | undefined {
	const base = process.env.NEXT_PUBLIC_APP_URL;
	if (!base) return undefined;
	return `${base.replace(/\/$/, '')}/admin/orders/${orderId}`;
}

/**
 * Posts a FedEx delivery exception/delay to the Slack #orders channel.
 * Same NON-PHI rules as postOrderEventToSlack: order number, tracking number,
 * FedEx code/description, and an admin deep link only. Never throws.
 */
export async function postFedexExceptionToSlack(params: {
	orderNumber: string;
	trackingNumber: string;
	code: string;
	description?: string;
	adminUrl?: string;
}): Promise<void> {
	if (!WEBHOOK_URL) return;

	try {
		const lines = [
			'*:warning: FedEx exception*',
			`*Order:* \`${params.orderNumber}\``,
			`*Tracking:* \`${params.trackingNumber}\``,
			`*Event:* ${params.code}${params.description ? ` — ${params.description}` : ''}`,
		];
		if (params.adminUrl) lines.push(`<${params.adminUrl}|Open in admin>`);

		await fetch(WEBHOOK_URL, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ text: lines.join('\n') }),
		});

		log.info('Posted FedEx exception to Slack', {
			orderNumber: params.orderNumber,
			code: params.code,
		});
	} catch (err: any) {
		log.error('Failed to post FedEx exception to Slack', {
			error: err?.message,
		});
		// Never throw — Slack failures must not break event processing.
	}
}
