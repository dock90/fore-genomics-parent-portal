import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDbUser } from "@/lib/user-service";
import { prisma } from "@/lib/prisma";
import { reportStorageService } from "@/lib/report-storage";
import { explorePreflight, exploreJson } from "@/lib/explore-cors";
import { isExploreAllowedEmail, EXPLORE_UNAVAILABLE } from "@/lib/explore-access";

// Node runtime required for Prisma + @google-cloud/storage
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return explorePreflight(request);
}

/**
 * GET /api/explore/report?kitId=...&kind=parent|clinical
 *
 * Verifies the signed-in parent owns the kit and that its results have been
 * delivered, then returns a short-lived signed URL to that child's parent
 * report PDF so the Explore app can display it in-app (alongside the
 * interactive genome). Called cross-origin from explore.foregenomics.com with a
 * Clerk session token.
 *
 * This mirrors the access rules of /api/reports/download (ownership + completed
 * onboarding) and ADDITIONALLY requires the one-time Explore consent.
 *
 * The consent requirement was added 2026-08-03, when Explore became report-only.
 * Before that, consent was enforced only on /genome — and since no kit has a
 * genome file, that gate was never reached, so the only thing standing between an
 * un-consented parent and Explore's whole content pipeline was a client-side
 * `if`. This route is the Explore-specific view of the report, so gating it here
 * is what makes the consent mean something.
 *
 * It does NOT restrict the parent's ordinary right to their delivered report:
 * /api/reports/download is the Health Hub path and is deliberately untouched. A
 * parent who never consents to Explore can still download their report there.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return exploreJson(request, { error: "Unauthorized" }, 401);
    }

    const kitId = request.nextUrl.searchParams.get("kitId");
    if (!kitId) {
      return exploreJson(request, { error: "kitId is required" }, 400);
    }

    const dbUser = await getDbUser(userId);
    if (!dbUser) {
      return exploreJson(request, { error: "User not found" }, 404);
    }

    // GATE: Explore is not launched — see src/lib/explore-access.ts. This blocks
    // only the *Explore* view of the report; the parent's normal Health Hub
    // report download (/api/reports/download) is untouched.
    if (!isExploreAllowedEmail(dbUser.email)) {
      return exploreJson(request, EXPLORE_UNAVAILABLE, 403);
    }

    // Ownership check: the kit must belong to an order this user is the parent of
    const kit = await prisma.kit.findFirst({
      where: { id: kitId, order: { parentId: dbUser.id } },
      include: { order: true, child: true },
    });

    if (!kit) {
      return exploreJson(
        request,
        { error: "Report not found or access denied" },
        404
      );
    }

    // Only surface the report once onboarding is complete (mirrors the Health
    // Hub download path) and the results have actually been delivered.
    const onboardingComplete = !!(
      kit.childId &&
      kit.consentId &&
      kit.questionnaireId
    );
    const resultsDelivered = /^COMPLETE/.test(kit.order.status);
    if (!onboardingComplete || !resultsDelivered) {
      return exploreJson(
        request,
        { error: "Report not available yet" },
        404
      );
    }

    // GATE: the one-time Explore consent. Checked AFTER the "is there anything
    // here at all" gates above so a parent is never asked to consent to a report
    // that does not exist yet — but BEFORE the signed URL is minted, which is the
    // point: this URL is what Explore feeds to its extractor, so consent has to
    // be a precondition of issuing it, not of rendering it.
    //
    // 403 + a distinct code, because the caller must react differently to this
    // than to the allowlist 403: one sends the parent to the consent screen, the
    // other to "Explore isn't available yet".
    if (!kit.exploreConsentedAt) {
      return exploreJson(request, { error: "consent_required" }, 403);
    }

    // Two distinct documents are reachable here. `parent` is the companion
    // report Explore reads and renders; `clinical` is the lab's own PDF, offered
    // as a download so the parent can hand a doctor the primary record. Both go
    // through the identical gate chain above — the kind only selects which
    // already-authorized file is signed.
    const kind = request.nextUrl.searchParams.get("kind") || "parent";
    if (kind !== "parent" && kind !== "clinical") {
      return exploreJson(request, { error: "Unknown report kind" }, 400);
    }

    const parentFileName = kit.parentReportFileName || kit.reportFileName;
    const clinicalFileName = kit.fullLabReportFileName;
    const fileName = kind === "clinical" ? clinicalFileName : parentFileName;
    if (!fileName) {
      return exploreJson(request, { error: "Report not found" }, 404);
    }

    let url: string;
    try {
      url = await reportStorageService.getReportUrl(fileName);
    } catch {
      return exploreJson(request, { error: "Report file not found" }, 404);
    }

    // Audit the access (best-effort)
    try {
      const { AuditService } = await import("@/lib/audit-service");
      await AuditService.logAction({
        orderId: kit.order.id,
        action: "EXPLORE_REPORT_ACCESS",
        userId,
        userEmail: dbUser.email,
        details: {
          kitId: kit.id,
          kitNumber: kit.kitNumber,
          fileName,
          kind,
          orderNumber: kit.order.orderNumber,
        },
      });
    } catch {
      /* non-fatal */
    }

    return exploreJson(request, {
      url,
      fileName,
      kind,
      // Which documents exist for this kit, so Explore can offer only the
      // downloads that will actually resolve rather than a dead menu item.
      available: {
        parent: !!parentFileName,
        clinical: !!clinicalFileName,
      },
      childName:
        [kit.child?.firstName, kit.child?.lastName].filter(Boolean).join(" ") ||
        null,
      childFirstName: kit.child?.firstName ?? null,
    });
  } catch (error) {
    return exploreJson(request, { error: "Failed to generate report URL" }, 500);
  }
}
