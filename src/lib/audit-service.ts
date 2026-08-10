import { prisma } from './prisma';
import { headers } from 'next/headers';
import { createLogger } from './logger';

const log = createLogger('Audit');

export interface AuditLogData {
	orderId?: string;
	action:
		| 'REPORT_UPLOAD'
		| 'REPORT_DOWNLOAD'
		| 'REPORT_ACCESS'
		| 'REPORT_DELETE'
		| 'CONSENT_DOWNLOAD'
		| 'CONSENT_CREATION'
		| 'TRF_DOWNLOAD'
		| 'TRF_CREATION'
		| 'COMBINED_DOCUMENT_ARCHIVE_DOWNLOAD'
		| 'TRF_CONSENT_GENERATION'
		| 'TRF_CONSENT_DOWNLOAD'
		| 'SIGNED_TRF_CONSENT_UPLOAD'
		| 'SIGNED_TRF_CONSENT_DOWNLOAD'
		| 'USER_LOGIN'
		| 'USER_LOGOUT'
		| 'STATUS_CHANGE'
		| 'EXPLORE_GENOME_ACCESS'
		| 'EXPLORE_REPORT_ACCESS'
		| 'EXPLORE_CONSENT_ACCEPTED'
		| 'GENOME_UPLOAD'
		/** A genome object failed validation and was never linked to a kit. */
		| 'GENOME_UPLOAD_REJECTED'
		| 'GENOME_DELETE';
	userId: string;
	userEmail: string;
	details?: Record<string, any>;
}

export class AuditService {
	/**
	 * `AuditLog.userId` is a foreign key to `User.id` (a cuid), but almost every
	 * caller has Clerk's user id (`user_…`) from `auth()`. Writing that straight
	 * through violates the constraint, the insert throws, and the catch below used
	 * to swallow it in silence — which is why the audit trail was nearly empty
	 * while every code path looked like it was logging correctly.
	 *
	 * Resolve to a real `User.id`, or null. Null is a perfectly good audit row:
	 * `userEmail` still records who acted.
	 */
	private static async resolveUserId(userId?: string | null): Promise<string | null> {
		if (!userId) return null;
		try {
			const user = userId.startsWith('user_')
				? await prisma.user.findUnique({ where: { clerkId: userId }, select: { id: true } })
				: await prisma.user.findUnique({ where: { id: userId }, select: { id: true } });
			return user?.id ?? null;
		} catch {
			return null;
		}
	}

	static async logAction(data: AuditLogData): Promise<void> {
		// `headers()` is only valid inside a request scope — it throws in a cron or
		// background job. Capture it separately so that failure costs us the IP,
		// not the whole audit entry.
		let ipAddress = 'unknown';
		let userAgent = 'unknown';
		try {
			const headersList = headers();
			ipAddress =
				headersList.get('x-forwarded-for') || headersList.get('x-real-ip') || 'unknown';
			userAgent = headersList.get('user-agent') || 'unknown';
		} catch {
			/* not in a request context */
		}

		try {
			await prisma.auditLog.create({
				data: {
					orderId: data.orderId,
					action: data.action,
					userId: await AuditService.resolveUserId(data.userId),
					userEmail: data.userEmail,
					ipAddress,
					userAgent,
					details: data.details || {},
				},
			});
		} catch (error) {
			// Still never throw — audit logging must not break the main flow — but it
			// must not fail invisibly either. A silent audit trail is worse than none,
			// because it looks like nothing happened.
			log.error('Failed to write audit entry', {
				action: data.action,
				orderId: data.orderId,
				userEmail: data.userEmail,
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}

	static async getAuditLogs(orderId: string): Promise<any[]> {
		return await prisma.auditLog.findMany({
			where: { orderId },
			orderBy: { createdAt: 'desc' },
			include: {
				order: {
					select: {
						orderNumber: true,
						status: true,
					},
				},
				user: {
					select: {
						email: true,
						role: true,
						profile: {
							select: {
								firstName: true,
								lastName: true,
							},
						},
					},
				},
			},
		});
	}

	static async getAuditLogsByUser(userEmail: string): Promise<any[]> {
		return await prisma.auditLog.findMany({
			where: { userEmail },
			orderBy: { createdAt: 'desc' },
			include: {
				order: {
					select: {
						orderNumber: true,
						status: true,
					},
				},
				user: {
					select: {
						email: true,
						role: true,
						profile: {
							select: {
								firstName: true,
								lastName: true,
							},
						},
					},
				},
			},
		});
	}

	static async getAuditLogsByAction(action: string): Promise<any[]> {
		return await prisma.auditLog.findMany({
			where: { action },
			orderBy: { createdAt: 'desc' },
			include: {
				order: {
					select: {
						orderNumber: true,
						status: true,
					},
				},
				user: {
					select: {
						email: true,
						role: true,
						profile: {
							select: {
								firstName: true,
								lastName: true,
							},
						},
					},
				},
			},
		});
	}
}
