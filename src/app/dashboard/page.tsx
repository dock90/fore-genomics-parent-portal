import { auth, clerkClient } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardContent from "@/components/DashboardContent";
import PurchaserDashboard from "@/components/PurchaserDashboard";
import UnbornChildDashboard from "@/components/UnbornChildDashboard";
import DashboardActionButtons from "@/components/DashboardActionButtons";

export default async function DashboardPage() {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Check if user is an admin and redirect to admin dashboard
  if ((sessionClaims?.metadata as any)?.role === "ADMIN") {
    redirect("/admin");
  }

  // Get user email from Clerk
  const client = await clerkClient();
  let clerkUser;
  let userEmail;

  try {
    clerkUser = await client.users.getUser(userId);
    userEmail = clerkUser.emailAddresses[0]?.emailAddress;
  } catch (error) {
    // If Clerk user doesn't exist, redirect to home page
    redirect("/");
  }

  if (!userEmail) {
    redirect("/onboarding");
  }

  // Get user data from database by email
  const dbUser = await prisma.user.findFirst({
    where: { email: userEmail },
    include: {
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
      parentOrders: {
        orderBy: { createdAt: "desc" },
      },
      purchaserOrders: {
        orderBy: { createdAt: "desc" },
      },
    },
  });

  // If user doesn't exist in database, redirect to onboarding
  if (!dbUser) {
    redirect("/onboarding");
  }

  // Get the appropriate orders based on user role
  const userOrders =
    dbUser.role === "PARENT" ? dbUser.parentOrders : dbUser.purchaserOrders;

  // Check if user has completed onboarding by checking order status
  if (userOrders.length > 0) {
    // Check for any orders that need onboarding completion
    const ordersNeedingOnboarding = userOrders.filter(
      (order) => order.status === "ORDER_RECEIVED"
    );

    if (ordersNeedingOnboarding.length > 0) {
      redirect("/onboarding");
    }

    // For multi-kit orders, check if all kits have completed onboarding
    for (const order of userOrders) {
      if (order.kitCount > 1) {
        const kits = await prisma.kit.findMany({
          where: { orderId: order.id },
          include: {
            child: true,
            consent: true,
            questionnaire: true,
          },
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
          // For unborn child orders, only require childId (dueDate is set during onboarding)
          const incompleteKits = kits.filter((kit) => !kit.childId);
          if (incompleteKits.length > 0) {
            redirect("/onboarding");
          }
        } else {
          // For regular orders, require all associations
          const incompleteKits = kits.filter(
            (kit) => !kit.childId || !kit.consentId || !kit.questionnaireId
          );
          if (incompleteKits.length > 0) {
            redirect("/onboarding");
          }
        }
      }
    }
  } else {
    // If user has no orders, redirect to onboarding
    redirect("/onboarding");
  }

  // Check if user has an unborn child (child with dueDate but no firstName)
  const unbornChild = dbUser.children.find(
    (child) => child.dueDate && !child.firstName && !child.lastName
  );

  // If user has 1 order and that order has an unborn child, show unborn child dashboard
  if (userOrders.length === 1 && unbornChild) {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-mobile container-tablet container-desktop">
          <div className="mobile-padding mobile-spacing">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
              <div>
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                  Welcome back!
                </h1>
              </div>
            </div>
            <UnbornChildDashboard user={dbUser} unbornChild={unbornChild} />
            <DashboardActionButtons />
          </div>
        </div>
      </div>
    );
  }

  // Get all orders for the user based on their role
  const orderWhere =
    dbUser.role === "ADMIN"
      ? {}
      : dbUser.role === "PARENT"
        ? { parentId: dbUser.id }
        : {
            OR: [{ purchaserId: dbUser.id }, { parentId: dbUser.id }],
          };

  const allOrders = await prisma.order.findMany({
    where: orderWhere,
    orderBy: { createdAt: "desc" },
    include: {
      kits: {
        include: {
          child: true,
          consent: true,
          questionnaire: true,
        },
      },
    },
  });

  // Determine which dashboard to show based on user role
  if (dbUser.role === "PURCHASER") {
    return (
      <div className="min-h-screen bg-background">
        <div className="container-mobile container-tablet container-desktop">
          <div className="mobile-padding mobile-spacing">
            <PurchaserDashboard user={dbUser} orders={allOrders} />
            <DashboardActionButtons />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container-mobile container-tablet container-desktop">
        <div className="mobile-padding mobile-spacing">
          <DashboardContent user={dbUser} orders={allOrders} />
          <DashboardActionButtons />
        </div>
      </div>
    </div>
  );
}
