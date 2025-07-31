import { prisma } from "./prisma";
import { headers } from "next/headers";

export interface AuditLogData {
  orderId: string;
  action:
    | "REPORT_UPLOAD"
    | "REPORT_DOWNLOAD"
    | "REPORT_ACCESS"
    | "REPORT_DELETE";
  userId: string;
  userEmail: string;
  details?: Record<string, any>;
}

export class AuditService {
  static async logAction(data: AuditLogData): Promise<void> {
    try {
      // Get client IP and user agent from headers
      const headersList = headers();
      const ipAddress =
        headersList.get("x-forwarded-for") ||
        headersList.get("x-real-ip") ||
        "unknown";
      const userAgent = headersList.get("user-agent") || "unknown";

      await prisma.auditLog.create({
        data: {
          orderId: data.orderId,
          action: data.action,
          userId: data.userId,
          userEmail: data.userEmail,
          ipAddress,
          userAgent,
          details: data.details || {},
        },
      });
    } catch (error) {
      console.error("Failed to create audit log:", error);
      // Don't throw - audit logging shouldn't break the main functionality
    }
  }

  static async getAuditLogs(orderId: string): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: { orderId },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
      },
    });
  }

  static async getAuditLogsByUser(userEmail: string): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: { userEmail },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
      },
    });
  }

  static async getAuditLogsByAction(action: string): Promise<any[]> {
    return await prisma.auditLog.findMany({
      where: { action },
      orderBy: { createdAt: "desc" },
      include: {
        order: {
          select: {
            orderNumber: true,
            status: true,
          },
        },
      },
    });
  }
}
