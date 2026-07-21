import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('HealthCheck');

export type IssueSeverity = 'warning' | 'critical';

export interface HealthIssue {
  type: string;
  severity: IssueSeverity;
  message: string;
  count?: number;
  details?: string[];
}

const STALE_ORDER_RECEIVED_DAYS = 5;
const STALE_STATUS_DAYS = 14;
const TERMINAL_STATUSES = [
  'COMPLETE_COUNSELING_REQUIRED',
  'COMPLETE_NO_COUNSELING_REQUIRED',
];

export async function runHealthChecks(): Promise<HealthIssue[]> {
  const issues: HealthIssue[] = [];
  const now = new Date();

  // 1. Database connectivity — all other checks depend on this
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch (err: any) {
    issues.push({
      type: 'DATABASE_DOWN',
      severity: 'critical',
      message: `Database connection failed: ${err?.message ?? 'unknown error'}`,
    });
    return issues;
  }

  // 2. Orders stuck in ORDER_RECEIVED for more than 5 days
  // Healthy flow: ORDER_RECEIVED → onboarding → kit shipped within a few days.
  // A stale ORDER_RECEIVED may indicate the Shopify/Stripe webhook fired but
  // the parent never received their invite (Clerk or Klaviyo failure).
  try {
    const cutoff = new Date(now.getTime() - STALE_ORDER_RECEIVED_DAYS * 24 * 60 * 60 * 1000);
    const staleOrders = await prisma.order.findMany({
      where: {
        status: 'ORDER_RECEIVED',
        statusUpdatedAt: { lt: cutoff },
      },
      select: { orderNumber: true, statusUpdatedAt: true },
      orderBy: { statusUpdatedAt: 'asc' },
      take: 10,
    });

    if (staleOrders.length > 0) {
      issues.push({
        type: 'STALE_ORDER_RECEIVED',
        severity: 'warning',
        message: `${staleOrders.length} order(s) have been in ORDER_RECEIVED status for more than ${STALE_ORDER_RECEIVED_DAYS} days. Parent may not have received their portal invite.`,
        count: staleOrders.length,
        details: staleOrders.map(
          o => `${o.orderNumber} (stuck since ${o.statusUpdatedAt.toLocaleDateString()})`
        ),
      });
    }
  } catch (err: any) {
    log.error('Failed to check stale ORDER_RECEIVED orders', { error: err?.message });
  }

  // 3. Non-terminal orders with no status update in more than 14 days
  try {
    const cutoff = new Date(now.getTime() - STALE_STATUS_DAYS * 24 * 60 * 60 * 1000);
    const stalledOrders = await prisma.order.findMany({
      where: {
        status: { notIn: TERMINAL_STATUSES as any },
        statusUpdatedAt: { lt: cutoff },
      },
      select: { orderNumber: true, status: true, statusUpdatedAt: true },
      orderBy: { statusUpdatedAt: 'asc' },
      take: 10,
    });

    if (stalledOrders.length > 0) {
      issues.push({
        type: 'STALLED_ORDER',
        severity: 'warning',
        message: `${stalledOrders.length} active order(s) have had no status change in more than ${STALE_STATUS_DAYS} days.`,
        count: stalledOrders.length,
        details: stalledOrders.map(
          o => `${o.orderNumber} — ${o.status} (last updated ${o.statusUpdatedAt.toLocaleDateString()})`
        ),
      });
    }
  } catch (err: any) {
    log.error('Failed to check stalled orders', { error: err?.message });
  }

  // 4. Orders with failed Clerk invite URL capture in the last 48 hours
  // inviteUrlCaptured: false in the audit log means the Clerk invitation API
  // returned without a URL — the parent won't receive a Klaviyo welcome email
  // with their portal link.
  try {
    const cutoff = new Date(now.getTime() - 48 * 60 * 60 * 1000);
    const recentWebhookLogs = await prisma.auditLog.findMany({
      where: {
        action: { in: ['ORDER_CREATED_FROM_SHOPIFY', 'ORDER_CREATED_FROM_STRIPE'] },
        createdAt: { gte: cutoff },
      },
      select: { details: true, userEmail: true, createdAt: true },
    });

    const failed = recentWebhookLogs.filter(entry => {
      const d = entry.details as Record<string, unknown>;
      return d?.inviteUrlCaptured === false;
    });

    if (failed.length > 0) {
      issues.push({
        type: 'CLERK_INVITE_FAILED',
        severity: 'critical',
        message: `${failed.length} order(s) in the last 48 hours failed to capture a Clerk invite URL. Affected parents will not receive a portal invite via Klaviyo.`,
        count: failed.length,
        details: failed.map(l => `${l.userEmail} at ${l.createdAt.toLocaleString()}`),
      });
    }
  } catch (err: any) {
    log.error('Failed to check Clerk invite audit logs', { error: err?.message });
  }

  // 5. Orders with kit count > 0 but no kit records created
  // Indicates a partial failure during order creation — the order row was
  // inserted but the kit creation loop failed or was interrupted.
  try {
    const orphanedOrders = await prisma.order.findMany({
      where: {
        kitCount: { gt: 0 },
        kits: { none: {} },
      },
      select: { orderNumber: true, kitCount: true, createdAt: true },
      orderBy: { createdAt: 'desc' },
      take: 10,
    });

    if (orphanedOrders.length > 0) {
      issues.push({
        type: 'ORDER_MISSING_KITS',
        severity: 'critical',
        message: `${orphanedOrders.length} order(s) have a kit count but no kit records in the database. Order creation partially failed.`,
        count: orphanedOrders.length,
        details: orphanedOrders.map(
          o => `${o.orderNumber} — expected ${o.kitCount} kit(s), created ${o.createdAt.toLocaleDateString()}`
        ),
      });
    }
  } catch (err: any) {
    log.error('Failed to check orders missing kits', { error: err?.message });
  }

  return issues;
}
