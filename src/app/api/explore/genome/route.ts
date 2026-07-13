import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { getDbUser } from "@/lib/user-service";
import { prisma } from "@/lib/prisma";
import { genomeStorageService } from "@/lib/genome-storage";
import { explorePreflight, exploreJson } from "@/lib/explore-cors";

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
