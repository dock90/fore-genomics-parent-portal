import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDbUser } from "@/lib/user-service";
import { prisma } from "@/lib/prisma";
import { reportStorageService } from "@/lib/report-storage";
import { explorePreflight, exploreJson } from "@/lib/explore-cors";
import { isExploreAllowedEmail, EXPLORE_UNAVAILABLE } from "@/lib/explore-access";
import { createLogger } from "@/lib/logger";

const log = createLogger("ExploreShare");

// Node runtime required for Prisma, @google-cloud/storage and Buffer.
export const dynamic = "force-dynamic";

/**
 * Longer than the 30s `vercel.json` gives every other API route.
 *
 * This one moves a file twice — down from GCS, then up to Gmail, base64-encoded
 * to roughly 20MB at the cap. The usual case is a few seconds, but a slow leg
 * on either side would otherwise hit the platform limit mid-upload, and the
 * timeout lands AFTER the audit row is written: the parent would be told it
 * failed while the disclosure log says it was shared. Sixty seconds is inside
 * the Hobby ceiling too, so it holds on any plan.
 */
export const maxDuration = 60;

/**
 * How many shares one parent may send in an hour.
 *
 * This is the only endpoint in the app that mails a file to an address a user
 * typed, which makes it the only one that could be turned into a sender for
 * someone else's traffic. A parent handing results to a paediatrician, a
 * specialist and a school nurse in one sitting is three; nobody legitimately
 * needs twenty.
 */
const SHARES_PER_HOUR = 5;

/**
 * The largest report we will put on an SMTP message.
 *
 * Base64 inflates an attachment by about a third, and most mailboxes reject
 * over 25MB, so this leaves room. A report above it is a real delivery failure
 * we should report honestly rather than a silent bounce hours later.
 */
const MAX_ATTACHMENT_BYTES = 15 * 1024 * 1024;

const DOCUMENT_LABELS = {
  parent: "Parent report",
  pediatrician: "Summary for the doctor",
  clinical: "Full laboratory report",
} as const;

type ShareKind = keyof typeof DOCUMENT_LABELS;

function isShareKind(v: unknown): v is ShareKind {
  return v === "parent" || v === "pediatrician" || v === "clinical";
}

/**
 * Deliberately permissive, and deliberately still here.
 *
 * The client validates too, but the client is not a gate: this is the check
 * that decides whether an address gets a child's clinical record. The length
 * cap is the part that matters most — an unbounded string reaches the SMTP
 * header, and a newline in a header is header injection.
 */
function isValidRecipient(value: string): boolean {
  if (value.length > 254) return false;
  if (/[\r\n]/.test(value)) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value);
}

export async function OPTIONS(request: NextRequest) {
  return explorePreflight(request);
}

/**
 * POST /api/explore/share  { kitId, kind, to }
 *
 * Emails one of a child's delivered reports to a clinician the parent names,
 * as an attachment.
 *
 * This is the only route in the app that sends a file to a recipient chosen by
 * a user, so it stands behind the whole /api/explore/report gate chain — Clerk
 * session, Explore allowlist, kit ownership, completed onboarding, delivered
 * results, and the one-time Explore consent — and then adds three of its own:
 * a validated recipient, a rate limit, and an attachment ceiling.
 *
 * Two design points are load-bearing and should survive any rewrite:
 *
 *   1. The report is ATTACHED, never linked. A V4 signed URL is a bearer
 *      credential; one sitting in a clinic mailbox is a child's record readable
 *      by anyone the message reaches, with no sign-in and no revocation. The
 *      bytes are read server-side so no URL is ever minted.
 *   2. Every send writes an EXPLORE_REPORT_SHARED audit row naming the
 *      recipient — and unlike the access rows elsewhere, that write is NOT
 *      best-effort. A disclosure to a third party that we cannot evidence is
 *      worse than a share that failed, so if the log cannot be written the mail
 *      does not go.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return exploreJson(request, { error: "Unauthorized" }, 401);
    }

    let body: { kitId?: unknown; kind?: unknown; to?: unknown };
    try {
      body = await request.json();
    } catch {
      return exploreJson(request, { error: "Invalid body" }, 400);
    }

    const kitId = typeof body.kitId === "string" ? body.kitId : "";
    const to = typeof body.to === "string" ? body.to.trim() : "";
    const kind = body.kind;

    if (!kitId) {
      return exploreJson(request, { error: "kitId is required" }, 400);
    }
    if (!isShareKind(kind)) {
      return exploreJson(request, { error: "Unknown report kind" }, 400);
    }
    if (!isValidRecipient(to)) {
      return exploreJson(request, { error: "invalid_email" }, 400);
    }

    const dbUser = await getDbUser(userId);
    if (!dbUser) {
      return exploreJson(request, { error: "User not found" }, 404);
    }

    // GATE: Explore is not launched — see src/lib/explore-access.ts.
    if (!isExploreAllowedEmail(dbUser.email)) {
      return exploreJson(request, EXPLORE_UNAVAILABLE, 403);
    }

    const kit = await prisma.kit.findFirst({
      where: { id: kitId, order: { parentId: dbUser.id } },
      include: { order: true, child: true },
    });
    if (!kit) {
      return exploreJson(request, { error: "Report not found or access denied" }, 404);
    }

    const onboardingComplete = !!(kit.childId && kit.consentId && kit.questionnaireId);
    const resultsDelivered = /^COMPLETE/.test(kit.order.status);
    if (!onboardingComplete || !resultsDelivered) {
      return exploreJson(request, { error: "Report not available yet" }, 404);
    }

    // GATE: the one-time Explore consent, for the same reason /report requires
    // it — this is the Explore view of the document, and consent has to be a
    // precondition of the record leaving, not of it rendering.
    if (!kit.exploreConsentedAt) {
      return exploreJson(request, { error: "consent_required" }, 403);
    }

    const fileName = {
      parent: kit.parentReportFileName || kit.reportFileName,
      pediatrician: kit.pediatricianReportFileName,
      clinical: kit.fullLabReportFileName,
    }[kind];
    if (!fileName) {
      return exploreJson(request, { error: "Report not found" }, 404);
    }

    // Rate limit off the audit trail rather than a new table: the rows we are
    // required to write anyway are already an accurate record of sends.
    const sentInLastHour = await prisma.auditLog.count({
      where: {
        action: "EXPLORE_REPORT_SHARED",
        userEmail: dbUser.email,
        createdAt: { gte: new Date(Date.now() - 60 * 60 * 1000) },
      },
    });
    if (sentInLastHour >= SHARES_PER_HOUR) {
      return exploreJson(request, { error: "rate_limited" }, 429);
    }

    let file: { buffer: Buffer; contentType: string };
    try {
      file = await reportStorageService.getReportBuffer(fileName);
    } catch {
      return exploreJson(request, { error: "Report file not found" }, 404);
    }
    if (file.buffer.byteLength > MAX_ATTACHMENT_BYTES) {
      return exploreJson(request, { error: "too_large" }, 413);
    }

    const childName =
      [kit.child?.firstName, kit.child?.lastName].filter(Boolean).join(" ") || "this child";

    // The disclosure record is written BEFORE the send and is allowed to fail
    // the request. Everywhere else in this codebase an audit write is a
    // swallowed best-effort; here it is the point. A child's record reaching a
    // third party with no evidence of who received it is the failure we cannot
    // accept, and a share that did not happen is one we can.
    try {
      const { AuditService } = await import("@/lib/audit-service");
      await AuditService.logAction({
        orderId: kit.order.id,
        action: "EXPLORE_REPORT_SHARED",
        userId,
        userEmail: dbUser.email,
        details: {
          kitId: kit.id,
          kitNumber: kit.kitNumber,
          orderNumber: kit.order.orderNumber,
          kind,
          fileName,
          recipient: to,
          bytes: file.buffer.byteLength,
        },
      });
    } catch {
      return exploreJson(request, { error: "Could not record the share" }, 500);
    }

    try {
      const { sendReportToClinician } = await import("@/lib/clinician-share-email");
      await sendReportToClinician({
        to,
        childName,
        sharedByEmail: dbUser.email,
        documentLabel: DOCUMENT_LABELS[kind],
        attachment: {
          filename: `${childName.replace(/[^\w -]/g, "")} — ${DOCUMENT_LABELS[kind]}.pdf`,
          content: file.buffer,
          contentType: file.contentType,
        },
      });
    } catch (error) {
      // Gmail's response says which quota, scope or delegation step is missing,
      // and every one of those is a setup problem an operator has to see.
      log.error("Gmail send failed", {
        kitId: kit.id,
        kind,
        error: error instanceof Error ? error.message : String(error),
      });
      // The audit row above now records a share that did not leave. That is the
      // safe direction to be wrong in — it over-reports a disclosure rather
      // than hiding one — and the parent is told plainly that it failed.
      return exploreJson(request, { error: "send_failed" }, 502);
    }

    return exploreJson(request, { sent: true, to, kind });
  } catch {
    return exploreJson(request, { error: "Failed to share report" }, 500);
  }
}
