import { prisma } from "./prisma";

export type OrderStatus =
  | "ORDER_RECEIVED"
  | "ONBOARDING_COMPLETED"
  | "PREPARING_ORDER"
  | "SHIPPED_TO_USER"
  | "DELIVERED_AWAITING_RETURN"
  | "SHIPPED_TO_LAB"
  | "RECEIVED_IN_PROCESS"
  | "COMPLETE_REPORT_DELIVERED"
  | "COMPLETE_NO_COUNSELING_REQUIRED";

export class OrderService {
  /**
   * Check if all kits in an order have completed onboarding
   * @param orderId - The ID of the order to check
   * @returns Promise<boolean> - True if all kits are complete, false otherwise
   */
  static async isOrderComplete(orderId: string): Promise<boolean> {
    // Get all kits for this order
    const kits = await prisma.kit.findMany({
      where: { orderId },
      include: {
        child: true,
        consent: true,
        questionnaire: true,
      },
    });

    if (kits.length === 0) return false;

    // Check if all kits have the required data (child, consent, and questionnaire)
    return kits.every(kit => 
      kit.childId && 
      kit.consentId && 
      kit.questionnaireId
    );
  }

  /**
   * Get an order with all its related data
   * @param orderId - The ID of the order to retrieve
   * @returns Promise<Order | null> - The order with all relations
   */
  static async getOrderById(orderId: string) {
    return await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        parent: {
          include: {
            profile: true,
          },
        },
        purchaser: {
          include: {
            profile: true,
          },
        },
        kits: {
          include: {
            child: true,
            consent: true,
            questionnaire: true,
          },
          orderBy: { kitNumber: "asc" },
        },
        parentInvitations: true,
      },
    });
  }

  /**
   * Update the status of an order
   * @param orderId - The ID of the order to update
   * @param status - The new status
   * @returns Promise<Order> - The updated order
   */
  static async updateOrderStatus(orderId: string, status: OrderStatus) {
    return await prisma.order.update({
      where: { id: orderId },
      data: {
        status,
        statusUpdatedAt: new Date(),
      },
    });
  }

  /**
   * Get all orders for a user based on their role
   * @param userId - The ID of the user
   * @param userRole - The role of the user (PARENT, PURCHASER, ADMIN)
   * @returns Promise<Order[]> - Array of orders
   */
  static async getOrdersForUser(userId: string, userRole: string) {
    const orderWhere =
      userRole === "ADMIN"
        ? {}
        : userRole === "PARENT"
          ? { parentId: userId }
          : { purchaserId: userId };

    return await prisma.order.findMany({
      where: orderWhere,
      include: {
        parent: {
          include: {
            profile: true,
          },
        },
        purchaser: {
          include: {
            profile: true,
          },
        },
        kits: {
          include: {
            child: true,
            consent: true,
            questionnaire: true,
          },
          orderBy: { kitNumber: "asc" },
        },
        parentInvitations: true,
      },
      orderBy: { createdAt: "desc" },
    });
  }

  /**
   * Get orders by status
   * @param status - The status to filter by
   * @returns Promise<Order[]> - Array of orders with the specified status
   */
  static async getOrdersByStatus(status: OrderStatus) {
    return await prisma.order.findMany({
      where: { status },
      include: {
        parent: {
          include: {
            profile: true,
          },
        },
        purchaser: {
          include: {
            profile: true,
          },
        },
        kits: {
          include: {
            child: true,
            consent: true,
            questionnaire: true,
          },
          orderBy: { kitNumber: "asc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
  }
}
