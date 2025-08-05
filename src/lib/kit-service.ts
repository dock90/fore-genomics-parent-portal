import { prisma } from "./prisma";

export type KitType = "BASE" | "PLUS" | "PREMIUM";
export type OrderStatus =
  | "ORDER_RECEIVED"
  | "ONBOARDING_COMPLETED"
  | "PREPARING_ORDER"
  | "SHIPPED_TO_USER"
  | "DELIVERED_AWAITING_RETURN"
  | "SHIPPED_TO_LAB"
  | "RECEIVED_IN_PROCESS"
  | "COMPLETE_REPORT_DELIVERED"
  | "COMPLETE_COUNSELING_REQUIRED";

export class KitService {
  static async createKitsForOrder(
    orderId: string,
    kitCount: number,
    kitTypes: KitType[] = []
  ) {
    const kits = [];
    for (let i = 1; i <= kitCount; i++) {
      const kitType = kitTypes[i - 1] || "BASE"; // Default to BASE if not specified
      const kit = await prisma.kit.create({
        data: {
          orderId,
          kitNumber: i,
          kitType,
          childId: null,
          consentId: null,
          questionnaireId: null,
        },
      });
      kits.push(kit);
    }
    return kits;
  }

  static async getKitsForOrder(orderId: string) {
    return await prisma.kit.findMany({
      where: { orderId },
      include: {
        child: {
          include: {
            user: {
              include: {
                profile: true,
              },
            },
          },
        },
        consent: true,
        questionnaire: true,
      },
      orderBy: { kitNumber: "asc" },
    });
  }

  static async updateKitType(kitId: string, kitType: KitType) {
    return await prisma.kit.update({
      where: { id: kitId },
      data: { kitType },
    });
  }

  static async getKitById(kitId: string) {
    return await prisma.kit.findUnique({
      where: { id: kitId },
      include: {
        child: true,
        consent: true,
        questionnaire: true,
        order: {
          include: {
            parent: true,
            purchaser: true,
          },
        },
      },
    });
  }

  static async isAllKitsComplete(orderId: string): Promise<boolean> {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      select: { status: true },
    });

    if (!order) return false;

    return (
      order.status === "ONBOARDING_COMPLETED" ||
      order.status === "PREPARING_ORDER" ||
      order.status === "SHIPPED_TO_USER" ||
      order.status === "DELIVERED_AWAITING_RETURN" ||
      order.status === "SHIPPED_TO_LAB" ||
      order.status === "RECEIVED_IN_PROCESS" ||
      order.status === "COMPLETE_REPORT_DELIVERED" ||
      order.status === "COMPLETE_COUNSELING_REQUIRED"
    );
  }

  static getKitTypeDisplayName(kitType: KitType): string {
    switch (kitType) {
      case "BASE":
        return "Base Kit";
      case "PLUS":
        return "Plus Kit";
      case "PREMIUM":
        return "Premium Kit";
      default:
        return "Unknown Kit";
    }
  }

  static getKitTypeDescription(kitType: KitType): string {
    switch (kitType) {
      case "BASE":
        return "Standard genetic testing panel";
      case "PLUS":
        return "Enhanced testing with additional markers";
      case "PREMIUM":
        return "Comprehensive testing with full genome analysis";
      default:
        return "";
    }
  }

  static getKitTypeColor(kitType: KitType): string {
    switch (kitType) {
      case "BASE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PLUS":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "PREMIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  }

  static async getPendingKitsForUser(userId: string, userRole: string) {
    const orderWhere =
      userRole === "ADMIN"
        ? {}
        : userRole === "PARENT"
          ? { parentId: userId }
          : { purchaserId: userId };

    return await prisma.kit.findMany({
      where: {
        order: {
          ...orderWhere,
          status: "ORDER_RECEIVED",
        },
      },
      include: {
        order: true,
        child: true,
        consent: true,
        questionnaire: true,
      },
      orderBy: [{ order: { createdAt: "desc" } }, { kitNumber: "asc" }],
    });
  }

  static async getCompletedKitsForUser(userId: string, userRole: string) {
    const orderWhere =
      userRole === "ADMIN"
        ? {}
        : userRole === "PARENT"
          ? { parentId: userId }
          : { purchaserId: userId };

    return await prisma.kit.findMany({
      where: {
        order: {
          ...orderWhere,
          status: {
            in: [
              "ONBOARDING_COMPLETED",
              "PREPARING_ORDER",
              "SHIPPED_TO_USER",
              "DELIVERED_AWAITING_RETURN",
              "SHIPPED_TO_LAB",
              "RECEIVED_IN_PROCESS",
              "COMPLETE_REPORT_DELIVERED",
              "COMPLETE_COUNSELING_REQUIRED",
            ],
          },
        },
      },
      include: {
        order: true,
        child: true,
        consent: true,
        questionnaire: true,
      },
      orderBy: [{ order: { createdAt: "desc" } }, { kitNumber: "asc" }],
    });
  }
}
