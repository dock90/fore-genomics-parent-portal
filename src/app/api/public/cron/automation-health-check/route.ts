import { NextRequest, NextResponse } from 'next/server';
import { runHealthChecks } from '@/lib/health-check-service';
import { emailService } from '@/lib/email-service';
import { createLogger } from '@/lib/logger';

const log = createLogger('AutomationHealthCheck');

/**
 * POST /api/public/cron/automation-health-check
 *
 * Runs twice daily (8 AM and 8 PM UTC) via Vercel Cron.
 * Checks for broken automations and emails ADMIN_NOTIFICATION_EMAILS if issues found.
 *
 * Secured with CRON_SECRET bearer token (same as daily-counselor-notifications).
 */
export async function POST(request: NextRequest) {
  try {
    const authHeader = request.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET;
    if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    log.info('Starting automation health check');

    const issues = await runHealthChecks();

    // Check SMTP separately — if SMTP is down we can detect it but can't email about it
    let smtpHealthy = false;
    try {
      smtpHealthy = await emailService.verifyConnection();
      if (!smtpHealthy) {
        issues.push({
          type: 'SMTP_DOWN',
          severity: 'critical',
          message: 'SMTP connection verification failed. Admin notification emails (status changes, TRF approvals, onboarding) may not be delivering.',
        });
      }
    } catch {
      log.warn('Could not verify SMTP — email service may not be configured');
    }

    if (issues.length === 0) {
      log.info('Health check passed — all systems healthy');
      return NextResponse.json({
        success: true,
        message: 'All systems healthy',
        issueCount: 0,
        checkedAt: new Date().toISOString(),
      });
    }

    const criticalCount = issues.filter(i => i.severity === 'critical').length;
    const warningCount = issues.filter(i => i.severity === 'warning').length;
    log.warn(`Health check found ${issues.length} issue(s)`, {
      critical: criticalCount,
      warnings: warningCount,
      types: issues.map(i => i.type),
    });

    // Only send alert if SMTP is healthy — can't send alert about SMTP being down
    if (smtpHealthy) {
      await emailService.sendAutomationHealthAlert(issues);
      log.info('Health alert email sent to admins');
    } else {
      log.error('SMTP is down — health alert could not be emailed', {
        issueTypes: issues.map(i => i.type),
      });
    }

    return NextResponse.json({
      success: true,
      message: `Health check completed — ${criticalCount} critical, ${warningCount} warning`,
      issueCount: issues.length,
      alertEmailSent: smtpHealthy,
      checkedAt: new Date().toISOString(),
      issues: issues.map(i => ({
        type: i.type,
        severity: i.severity,
        message: i.message,
        count: i.count,
      })),
    });
  } catch (error) {
    log.error('Health check cron failed unexpectedly', {
      error: error instanceof Error ? error.message : String(error),
    });
    return NextResponse.json({ error: 'Health check failed' }, { status: 500 });
  }
}
