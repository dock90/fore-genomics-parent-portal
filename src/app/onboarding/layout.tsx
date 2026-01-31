import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/user-service";

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user is an admin and redirect to admin dashboard
  if ((sessionClaims?.metadata as any)?.role === "ADMIN") {
    redirect("/admin");
  }

  // Check if user is a counselor and redirect to counselor dashboard
  if ((sessionClaims?.metadata as any)?.role === "COUNSELOR") {
    redirect("/counselor");
  }

  // Get database user - uses clerkId internally but returns user with database ID
  const dbUser = await getDbUser(userId);

  // If user doesn't exist, allow onboarding (normal flow)
  if (!dbUser) {
    return <>{children}</>;
  }

  // Query orders directly for proper typing
  const userOrders = await prisma.order.findMany({
    where:
      dbUser.role === "PARENT"
        ? { parentId: dbUser.id }
        : { purchaserId: dbUser.id },
    orderBy: { createdAt: "desc" },
    take: 1,
  });

  // If user exists and has an order
  if (userOrders.length > 0) {
    const latestOrder = userOrders[0];

    // If order is in ORDER_RECEIVED status, user needs to complete onboarding
    if (latestOrder.status === ("ORDER_RECEIVED" as any)) {
      return <>{children}</>;
    }

    // If order is in ONBOARDING_COMPLETED or later status, check if kits are complete
    const postOnboardingStatuses = [
      "ONBOARDING_COMPLETED",
      "PREPARING_ORDER",
      "SHIPPED_TO_USER",
      "DELIVERED_AWAITING_RETURN",
      "SHIPPED_TO_LAB",
      "RECEIVED_IN_PROCESS",
      "COMPLETE_REPORT_DELIVERED",
    ];

    if (postOnboardingStatuses.includes(latestOrder.status)) {
      // For multi-kit orders, check if all kits have completed onboarding
      if (latestOrder.kitCount > 1) {
        const kits = await prisma.kit.findMany({
          where: { orderId: latestOrder.id },
          include: { child: true },
        });

        // Check if this order has an unborn child
        const hasUnbornChild = kits.some(
          (kit) =>
            kit.child &&
            kit.child.dueDate &&
            !kit.child.firstName &&
            !kit.child.lastName
        );

        if (hasUnbornChild) {
          // For unborn child orders, only require childId
          const incompleteKits = kits.filter((kit) => !kit.childId);
          if (incompleteKits.length > 0) {
            return <>{children}</>;
          }
        } else {
          // For regular orders, require all associations
          const incompleteKits = kits.filter(
            (kit) => !kit.childId || !kit.consentId || !kit.questionnaireId
          );
          if (incompleteKits.length > 0) {
            return <>{children}</>;
          }
        }
      }

      // All checks passed, redirect to dashboard
      redirect("/dashboard");
    }
  }

  // If user exists but has no orders, allow onboarding (normal flow)
  if (userOrders.length === 0) {
    return <>{children}</>;
  }

  // If we get here, user has completed onboarding and has orders in later status
  // Redirect to dashboard
  redirect("/dashboard");
}
