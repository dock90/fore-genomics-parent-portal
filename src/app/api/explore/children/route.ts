import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDbUser } from "@/lib/user-service";
import { prisma } from "@/lib/prisma";
import { explorePreflight, exploreJson } from "@/lib/explore-cors";
import { isExploreAllowedEmail, EXPLORE_UNAVAILABLE } from "@/lib/explore-access";

// Node runtime required for Prisma
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return explorePreflight(request);
}

/**
 * GET /api/explore/children
 *
 * Returns the kits belonging to the signed-in parent that have a raw genome
 * data file available, so the Explore app can populate its child switcher.
 * Called cross-origin from explore.foregenomics.com with a Clerk session token.
 */
export async function GET(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return exploreJson(request, { error: "Unauthorized" }, 401);
    }

    const dbUser = await getDbUser(userId);
    if (!dbUser) {
      return exploreJson(request, { error: "User not found" }, 404);
    }

    // GATE: Explore is not launched. Only the configured testers get any of a
    // child's data — this is the barrier, not the hidden dashboard CTA, because
    // explore.foregenomics.com is a separate deployment any signed-in customer
    // can open directly.
    if (!isExploreAllowedEmail(dbUser.email)) {
      return exploreJson(request, EXPLORE_UNAVAILABLE, 403);
    }

    // Return the parent's kits that have a child assigned (regardless of
    // genome availability) so Explore can render the correct gate state per
    // child: status tracker → consent → results.
    const kits = await prisma.kit.findMany({
      where: {
        childId: { not: null },
        order: { parentId: dbUser.id },
      },
      include: { child: true, order: true },
      orderBy: { kitNumber: "asc" },
    });

    const children = kits.map((kit) => ({
      kitId: kit.id,
      kitNumber: kit.kitNumber,
      orderNumber: kit.order.orderNumber,
      orderStatus: kit.order.status,
      childFirstName: kit.child?.firstName ?? null,
      childLastName: kit.child?.lastName ?? null,
      childName:
        [kit.child?.firstName, kit.child?.lastName].filter(Boolean).join(" ") ||
        null,
      sex: kit.child?.sex ?? null,
      dob: kit.child?.dob ?? null,
      // --- gate state ---
      genomeAvailable: !!kit.genomeDataFileName,
      // Whether a parent-facing report PDF has been delivered for this kit, so
      // Explore can offer it in-app instead of bouncing back to the Health Hub.
      reportAvailable: !!(kit.parentReportFileName || kit.reportFileName),
      onboardingComplete: !!(
        kit.childId &&
        kit.consentId &&
        kit.questionnaireId
      ),
      exploreConsentedAt: kit.exploreConsentedAt
        ? kit.exploreConsentedAt.toISOString()
        : null,
    }));

    return exploreJson(request, { children });
  } catch (error) {
    return exploreJson(request, { error: "Failed to load children" }, 500);
  }
}
