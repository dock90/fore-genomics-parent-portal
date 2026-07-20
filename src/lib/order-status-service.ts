import { OrderStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import { AuditService } from '@/lib/audit-service';
import {
	trackKitShipped,
	trackKitDelivered,
	trackSampleShipped,
	trackSampleReady,
	trackResampleReady,
	trackResultsReady,
} from '@/lib/klaviyo';
import { emailService } from '@/lib/email-service';
import { postOrderEventToSlack, buildAdminOrderUrl } from '@/lib/slack';
import { createLogger } from '@/lib/logger';

const log = createLogger('OrderStatusService');

export const STATUS_LABELS: Record<string, string> = {
	ORDER_RECEIVED: 'Order Received',
	ONBOARDING_COMPLETED: 'Onboarding Completed',
	PREPARING_ORDER: 'Preparing Order',
	SHIPPED_TO_USER: 'Kit Shipped to Customer',
	DELIVERED_AWAITING_RETURN: 'Delivered — Awaiting Return',
	SHIPPED_TO_LAB: 'Shipped to Lab',
	RECEIVED_IN_PROCESS: 'Received / In Process',
	RESAMPLE_REQUIRED: 'Resample Required',
	COMPLETE_REPORT_DELIVERED: 'Complete — Report Delivered',
	COMPLETE_COUNSELING_REQUIRED: 'Complete — Counseling Required',
	COMPLETE_NO_COUNSELING_REQUIRED: 'Complete — No Counseling Required',
	ORDER_CANCELED: 'Order Canceled',
};

export interface StatusTransitionInput {
	orderId: string;
	status: OrderStatus;
	/** Who/what is making the change — admin user or an automation. */
	actor: { userId: string; userEmail: string };
	/** For each optional field: `undefined` = leave unchanged, `null`/value = write. */
	notes?: string | null;
	outboundTrackingNumber?: string | null;
	inboundTrackingNumber?: string | null;
	/**
	 * Silent update — status change is persisted (and audited) but NO customer
	 * Klaviyo emails, admin notification email, or Slack post fire. Used for
	 * back-office cleanup of stale/incorrect orders.
	 */
	silent?: boolean;
	/** Extra details merged into the STATUS_CHANGE audit entry (e.g. the FedEx scan event). */
	auditDetails?: Record<string, unknown>;
}

/**
 * The single path for changing an order's status. Used by the admin UI
 * (src/app/actions.ts) and the FedEx tracking automation (src/lib/fedex) so
 * that audit logging, Klaviyo events, the admin notification email, and the
 * Slack #orders post behave identically no matter who moved the order.
 */
export async function applyOrderStatusTransition(
	input: StatusTransitionInput
): Promise<{ changed: boolean }> {
	const { orderId, status, actor, silent = false } = input;

	// Snapshot current order state before update — needed to decide which
	// Klaviyo events to fire.
	const previousOrder = await prisma.order.findUnique({
		where: { id: orderId },
		select: { status: true, outboundTrackingNumber: true },
	});
	if (!previousOrder) {
		throw new Error(`Order not found: ${orderId}`);
	}

	const data: {
		status: OrderStatus;
		statusUpdatedAt: Date;
		notes?: string | null;
		outboundTrackingNumber?: string | null;
		inboundTrackingNumber?: string | null;
	} = { status, statusUpdatedAt: new Date() };
	if (input.notes !== undefined) data.notes = input.notes;
	if (input.outboundTrackingNumber !== undefined)
		data.outboundTrackingNumber = input.outboundTrackingNumber;
	if (input.inboundTrackingNumber !== undefined)
		data.inboundTrackingNumber = input.inboundTrackingNumber;

	await prisma.order.update({ where: { id: orderId }, data });

	const changed = previousOrder.status !== status;

	// Log the status transition to the audit trail so the per-order timeline
	// can show exactly when each step happened and who (or what) did it.
	if (changed) {
		await AuditService.logAction({
			orderId,
			action: 'STATUS_CHANGE',
			userId: actor.userId,
			userEmail: actor.userEmail,
			details: {
				from: previousOrder.status,
				to: status,
				silent,
				...input.auditDetails,
			},
		});
	}

	// Klaviyo events + admin notifications — fire based on new status.
	// Entirely skipped for a silent update: no customer emails, no admin
	// notification email, and no Slack post. The status change and audit-log
	// entry above still happen.
	const order = await prisma.order.findUnique({
		where: { id: orderId },
		include: { parent: true, purchaser: true },
	});

	const email = order?.parent?.email ?? order?.purchaser?.email;

	if (!silent && email && order) {
		// The tracking number relevant to Kit Shipped: the value being written,
		// or (when the caller didn't touch tracking, e.g. FedEx automation
		// advancing a status) the number already on the order.
		const effectiveOutbound =
			input.outboundTrackingNumber !== undefined
				? input.outboundTrackingNumber
				: previousOrder.outboundTrackingNumber;

		// Kit Shipped — only fire when a tracking number is present.
		// Fires when: (a) status just moved to SHIPPED_TO_USER with a tracking number, OR
		//             (b) tracking number is newly added to an already-shipped order.
		// Never fires without a tracking number — would send a blank link in the email flow.
		const trackingPresent = !!effectiveOutbound;
		const statusChangedToShipped =
			status === 'SHIPPED_TO_USER' &&
			previousOrder.status !== 'SHIPPED_TO_USER';
		const trackingAddedWhileShipped =
			status === 'SHIPPED_TO_USER' &&
			previousOrder.status === 'SHIPPED_TO_USER' &&
			!previousOrder.outboundTrackingNumber &&
			trackingPresent;

		if (
			trackingPresent &&
			(statusChangedToShipped || trackingAddedWhileShipped)
		) {
			await trackKitShipped({
				email,
				orderId: order.id,
				orderNumber: order.orderNumber,
				trackingNumber: effectiveOutbound ?? undefined,
			});
		}

		if (
			status === 'DELIVERED_AWAITING_RETURN' &&
			previousOrder.status !== 'DELIVERED_AWAITING_RETURN'
		) {
			await trackKitDelivered({
				email,
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}

		if (status === 'SHIPPED_TO_LAB' && previousOrder.status !== 'SHIPPED_TO_LAB') {
			await trackSampleShipped({
				email,
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}

		if (
			status === 'RECEIVED_IN_PROCESS' &&
			previousOrder.status !== 'RECEIVED_IN_PROCESS'
		) {
			await trackSampleReady({
				email,
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}

		if (
			status === 'RESAMPLE_REQUIRED' &&
			previousOrder.status !== 'RESAMPLE_REQUIRED'
		) {
			await trackResampleReady({
				email,
				orderId: order.id,
				orderNumber: order.orderNumber,
			});
		}

		// Results Ready — the report is available to the parent. Fire for every
		// terminal "complete" status (report delivered, counseling required, or
		// no counseling required), not just COMPLETE_REPORT_DELIVERED. Only fire
		// on the first transition INTO a complete state, not when moving between them.
		const COMPLETE_STATUSES: string[] = [
			'COMPLETE_REPORT_DELIVERED',
			'COMPLETE_COUNSELING_REQUIRED',
			'COMPLETE_NO_COUNSELING_REQUIRED',
		];
		if (
			COMPLETE_STATUSES.includes(status) &&
			!COMPLETE_STATUSES.includes(previousOrder.status)
		) {
			await trackResultsReady({
				email,
				orderId: order.id,
				orderNumber: order.orderNumber,
				counselingRequired: status === 'COMPLETE_COUNSELING_REQUIRED',
			});
		}

		// Admin status change notification — fires on every non-silent update
		await emailService.sendAdminStatusChangeNotification({
			orderNumber: order.orderNumber,
			parentEmail: email,
			newStatus: status,
			statusLabel: STATUS_LABELS[status] ?? status,
			changedAt: new Date(),
			notes: input.notes ?? undefined,
		});

		// Mirror the status change into the Slack #orders channel — PHI-free
		// (order number + status + admin link only), and only on an actual change.
		if (changed) {
			await postOrderEventToSlack({
				orderNumber: order.orderNumber,
				status,
				statusLabel: STATUS_LABELS[status] ?? status,
				event: 'status_changed',
				adminUrl: buildAdminOrderUrl(order.id),
			});
		}
	}

	log.info('Order status transition applied', {
		orderId,
		from: previousOrder.status,
		to: status,
		changed,
		silent,
		actor: actor.userId,
	});

	return { changed };
}
