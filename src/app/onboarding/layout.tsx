import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";

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

  // Get user email from Clerk
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

  if (!userEmail) {
    redirect("/onboarding");
  }

  // Check if user exists in database and has an order
  const dbUser = await prisma.user.findFirst({
    where: { email: userEmail },
    include: {
      parentOrders: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      purchaserOrders: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      profile: true,
      children: true,
      consents: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      questionnaires: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
    },
  });

  // Get the appropriate orders based on user role
  const userOrders =
    dbUser?.role === "PARENT"
      ? dbUser.parentOrders
      : dbUser?.purchaserOrders || [];

  // If user exists and has an order
  if (dbUser && userOrders.length > 0) {
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

  // If user doesn't exist in database, allow onboarding (normal flow)
  if (!dbUser) {
    return <>{children}</>;
  }

  // If user exists but has no orders, allow onboarding (normal flow)
  if (userOrders.length === 0) {
    return <>{children}</>;
  }

  // If we get here, user has completed onboarding and has orders in later status
  // Redirect to dashboard
  redirect("/dashboard");
}
