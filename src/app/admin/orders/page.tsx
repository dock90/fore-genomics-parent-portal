import { prisma } from "@/lib/prisma";
import { OrdersManagement } from "../OrdersManagement";
import { CreateOrderModal } from "./CreateOrderModal";

export default async function OrdersPage() {
  // Fetch all orders with user information and kits
  const orders = await prisma.order.findMany({
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
        orderBy: {
          kitNumber: "asc",
        },
        include: {
          child: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  // Fetch all users for the modal
  const users = await prisma.user.findMany({
    include: {
      profile: true,
    },
    orderBy: {
      email: "asc",
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Orders</h1>
          <p className="text-muted-foreground mt-1">
            Manage orders, update status, and upload reports
          </p>
        </div>
        <CreateOrderModal users={users} />
      </div>

      {/* Orders Management */}
      <OrdersManagement orders={orders} />
    </div>
  );
}
