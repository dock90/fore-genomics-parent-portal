import { NextRequest, NextResponse } from "next/server";
import { checkRole } from "@/utils/roles";
import { AuditService } from "@/lib/audit-service";

// Mark this route as dynamic to eliminate build warnings
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    // Check that the user is an admin
    if (!checkRole("ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const orderId = searchParams.get("orderId");
    const userEmail = searchParams.get("userEmail");
    const action = searchParams.get("action");
    const limit = parseInt(searchParams.get("limit") || "50");

    let auditLogs;

    if (orderId) {
      auditLogs = await AuditService.getAuditLogs(orderId);
    } else if (userEmail) {
      auditLogs = await AuditService.getAuditLogsByUser(userEmail);
    } else if (action) {
      auditLogs = await AuditService.getAuditLogsByAction(action);
    } else {
      // Get all recent audit logs
      const { prisma } = await import("@/lib/prisma");
      auditLogs = await prisma.auditLog.findMany({
        take: limit,
        orderBy: { createdAt: "desc" },
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

    return NextResponse.json({ auditLogs });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch audit logs" },
      { status: 500 }
    );
  }
}
