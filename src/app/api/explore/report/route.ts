import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDbUser } from "@/lib/user-service";
import { prisma } from "@/lib/prisma";
import { reportStorageService } from "@/lib/report-storage";
import { explorePreflight, exploreJson } from "@/lib/explore-cors";

// Node runtime required for Prisma + @google-cloud/storage
export const dynamic = "force-dynamic";

export async function OPTIONS(request: NextRequest) {
  return explorePreflight(request);
}

/**
 * GET /api/explore/report?kitId=...
 *
 * Verifies the signed-in parent owns the kit and that its results have been
 * delivered, then returns a short-lived signed URL to that child's parent
 * report PDF so the Explore app can display it in-app (alongside the
 * interactive genome). Called cross-origin from explore.foregenomics.com with a
 * Clerk session token.
 *
 * This mirrors the access rules of /api/reports/download (ownership + completed
 * onboarding); it intentionally does NOT require the separate Explore consent,
 * because the parent already has the right to their delivered report.
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

    // The parent-facing report; fall back to the original single report file.
    const fileName = kit.parentReportFileName || kit.reportFileName;
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
          orderNumber: kit.order.orderNumber,
        },
      });
    } catch {
      /* non-fatal */
    }

    return exploreJson(request, {
      url,
      fileName,
      childName:
        [kit.child?.firstName, kit.child?.lastName].filter(Boolean).join(" ") ||
        null,
      childFirstName: kit.child?.firstName ?? null,
    });
  } catch (error) {
    return exploreJson(request, { error: "Failed to generate report URL" }, 500);
  }
}
