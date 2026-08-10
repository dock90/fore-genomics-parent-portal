import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDbUser } from "@/lib/user-service";
import { prisma } from "@/lib/prisma";
import { genomeStorageService } from "@/lib/genome-storage";
import { explorePreflight, exploreJson } from "@/lib/explore-cors";
import { isExploreAllowedEmail, EXPLORE_UNAVAILABLE } from "@/lib/explore-access";

// Node runtime required for Prisma + @google-cloud/storage
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return explorePreflight(request);
}

/**
 * GET /api/explore/genome?kitId=...
 *
 * Verifies the signed-in parent owns the kit, then returns a short-lived signed
 * URL to that child's raw genome file (VCF/.vcf.gz) so the Explore app can fetch
 * and process it in the browser. Called cross-origin from
 * explore.foregenomics.com with a Clerk session token.
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

    // GATE: Explore is not launched — see src/lib/explore-access.ts. Checked
    // before ownership so a non-tester never mints a signed genome URL.
    if (!isExploreAllowedEmail(dbUser.email)) {
      return exploreJson(request, EXPLORE_UNAVAILABLE, 403);
    }

    // Ownership check: the kit must belong to an order this user is the parent of
    const kit = await prisma.kit.findFirst({
      where: { id: kitId, order: { parentId: dbUser.id } },
      include: { order: true, child: true },
    });

    if (!kit || !kit.genomeDataFileName) {
      return exploreJson(
        request,
        { error: "Genome data not found or access denied" },
        404
      );
    }

    // Mirror /api/explore/report: a genome file attached before the order is
    // finished is operational state, not a delivered result. Without this gate a
    // consented parent could open interpreted results the lab has not signed off.
    const onboardingComplete = !!(
      kit.childId &&
      kit.consentId &&
      kit.questionnaireId
    );
    const resultsDelivered = /^COMPLETE/.test(kit.order.status);
    if (!onboardingComplete || !resultsDelivered) {
      return exploreJson(request, { error: "Results not available yet" }, 404);
    }

    // GATE: Explore results require the separate Explore consent. This is
    // enforced server-side so the genome is never served before consent —
    // the client gate is a UX layer, this is the real barrier.
    if (!kit.exploreConsentedAt) {
      return exploreJson(request, { error: "consent_required" }, 403);
    }

    // Confirm the object exists before minting a URL
    const exists = await genomeStorageService.genomeExists(
      kit.genomeDataFileName
    );
    if (!exists) {
      return exploreJson(request, { error: "Genome file not found" }, 404);
    }

    const url = await genomeStorageService.getGenomeUrl(kit.genomeDataFileName);

    // Audit the access (best-effort)
    try {
      const { AuditService } = await import("@/lib/audit-service");
      await AuditService.logAction({
        orderId: kit.order.id,
        action: "EXPLORE_GENOME_ACCESS",
        userId,
        userEmail: dbUser.email,
        details: {
          kitId: kit.id,
          kitNumber: kit.kitNumber,
          fileName: kit.genomeDataFileName,
          orderNumber: kit.order.orderNumber,
        },
      });
    } catch {
      /* non-fatal */
    }

    // Klaviyo "Results Viewed" — a consent-gated genome fetch is the moment a
    // parent opens their child's interactive results in Explore. Awaited (Next
    // 14 has no stable after()), but best-effort: track() never throws and this
    // guard keeps the genome response unaffected if Klaviyo is slow or down.
    try {
      const { trackResultsViewed } = await import("@/lib/klaviyo");
      await trackResultsViewed({
        email: dbUser.email,
        orderId: kit.order.id,
        orderNumber: kit.order.orderNumber,
        childName: kit.child?.firstName ?? null,
        kitNumber: kit.kitNumber ?? null,
      });
    } catch {
      /* non-fatal */
    }

    const childName =
      [kit.child?.firstName, kit.child?.lastName].filter(Boolean).join(" ") ||
      null;

    return exploreJson(request, {
      url,
      fileName: kit.genomeDataFileName,
      childName,
      childFirstName: kit.child?.firstName ?? null,
      sex: kit.child?.sex ?? null,
    });
  } catch (error) {
    return exploreJson(request, { error: "Failed to generate genome URL" }, 500);
  }
}
