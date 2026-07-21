/**
 * FedEx tracking automation — shared types.
 *
 * Terminology: an order has two FedEx legs.
 *   OUTBOUND — kit to the family   (Order.outboundTrackingNumber)
 *   INBOUND  — sample back to the lab (Order.inboundTrackingNumber)
 */
import type { OrderStatus } from '@prisma/client';

/** Linear pipeline order — used to guarantee we only ever move forward. */
export const STATUS_PIPELINE: OrderStatus[] = [
	'ORDER_RECEIVED',
	'ONBOARDING_COMPLETED',
	'PREPARING_ORDER',
	'SHIPPED_TO_USER',
	'DELIVERED_AWAITING_RETURN',
	'SHIPPED_TO_LAB',
	'RECEIVED_IN_PROCESS',
];

export type Direction = 'OUTBOUND' | 'INBOUND';

/** What a FedEx event means, independent of FedEx's code soup. */
export type EventKind =
	| 'LABEL_CREATED'
	| 'MOVEMENT'
	| 'DELIVERED'
	| 'EXCEPTION'
	| 'UNKNOWN';

export interface NormalizedEvent {
	trackingNumber: string;
	kind: EventKind;
	/** Raw FedEx code the kind was derived from (scanEvent.eventCode / derivedCode). */
	code: string;
	description?: string;
	occurredAt?: Date;
	source: 'webhook' | 'poll';
	/** Original payload fragment, kept in the FedexTrackingEvent audit row. */
	raw?: unknown;
}

export interface OrderShippingRecord {
	orderId: string;
	status: OrderStatus;
	outboundTrackingNumber?: string | null;
	inboundTrackingNumber?: string | null;
}

export interface ApplyOptions {
	/** When the INBOUND leg shows DELIVERED (sample arrived at the lab), advance
	 *  to RECEIVED_IN_PROCESS automatically. Default true
	 *  (env FEDEX_ADVANCE_ON_LAB_DELIVERY=false to disable). */
	advanceOnLabDelivery: boolean;
}

export type ApplyResult =
	| { action: 'unmatched'; trackingNumber: string }
	| { action: 'logged'; orderId: string }
	| { action: 'skipped'; orderId: string; reason: string }
	| { action: 'advanced'; orderId: string; from: OrderStatus; to: OrderStatus };
