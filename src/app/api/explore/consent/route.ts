import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDbUser } from "@/lib/user-service";
import { prisma } from "@/lib/prisma";
import { explorePreflight, exploreJson } from "@/lib/explore-cors";
import { isExploreAllowedEmail, EXPLORE_UNAVAILABLE } from "@/lib/explore-access";

// Node runtime required for Prisma
export const dynamic = "force-dynamic";

// Bump when the Explore consent content materially changes.
const CURRENT_EXPLORE_CONSENT_VERSION = "2026-07-explore-v1";

export async function OPTIONS(request: NextRequest) {
  return explorePreflight(request);
}

/**
 * POST /api/explore/consent   body: { kitId, signerName }
 *
 * Records the signed-in parent's consent to the (separate) Fore Explore
 * product for one kit/child. This is the gate that unlocks genome access in
 * /api/explore/genome. Called cross-origin from explore.foregenomics.com.
 */
export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return exploreJson(request, { error: "Unauthorized" }, 401);
    }

    let body: { kitId?: string; signerName?: string } = {};
    try {
      body = await request.json();
    } catch {
      return exploreJson(request, { error: "Invalid body" }, 400);
    }
    const { kitId, signerName } = body;
    if (!kitId) {
      return exploreJson(request, { error: "kitId is required" }, 400);
    }

    const dbUser = await getDbUser(userId);
    if (!dbUser) {
      return exploreJson(request, { error: "User not found" }, 404);
    }

    // GATE: Explore is not launched — see src/lib/explore-access.ts. A consent
    // record for an unlaunched product is not something we want on a customer's
    // kit, so non-testers are refused before anything is written.
    if (!isExploreAllowedEmail(dbUser.email)) {
      return exploreJson(request, EXPLORE_UNAVAILABLE, 403);
    }

    // Ownership check
    const kit = await prisma.kit.findFirst({
      where: { id: kitId, order: { parentId: dbUser.id } },
      include: { order: true },
    });
    if (!kit) {
      return exploreJson(
        request,
        { error: "Kit not found or access denied" },
        404
      );
    }

    const consentedAt = new Date();
    await prisma.kit.update({
      where: { id: kit.id },
      data: {
        exploreConsentedAt: consentedAt,
        exploreConsentSignerName: signerName?.slice(0, 200) || null,
        exploreConsentVersion: CURRENT_EXPLORE_CONSENT_VERSION,
      },
    });

    // Audit (best-effort)
    try {
      const { AuditService } = await import("@/lib/audit-service");
      await AuditService.logAction({
        orderId: kit.order.id,
        action: "EXPLORE_CONSENT_ACCEPTED",
        userId,
        userEmail: dbUser.email,
        details: {
          kitId: kit.id,
          kitNumber: kit.kitNumber,
          orderNumber: kit.order.orderNumber,
          version: CURRENT_EXPLORE_CONSENT_VERSION,
          signerName: signerName || null,
        },
      });
    } catch {
      /* non-fatal */
    }

    return exploreJson(request, {
      ok: true,
      exploreConsentedAt: consentedAt.toISOString(),
      version: CURRENT_EXPLORE_CONSENT_VERSION,
    });
  } catch (error) {
    return exploreJson(request, { error: "Failed to record consent" }, 500);
  }
}
