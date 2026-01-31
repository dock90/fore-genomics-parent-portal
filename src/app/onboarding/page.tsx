import { auth } from "@clerk/nextjs/server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getDbUser } from "@/lib/user-service";
import { OnboardingV2 } from "@/components/onboarding-v2";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircle } from "lucide-react";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    redirect("/sign-in");
  }

  // Get database user - uses clerkId internally but returns user with database ID
  const dbUser = await getDbUser(userId);

  if (!dbUser) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-100">
              <AlertCircle className="h-6 w-6 text-amber-600" />
            </div>
            <CardTitle>No Order Found</CardTitle>
            <CardDescription>
              It looks like you don&apos;t have an active order yet.
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center text-sm text-muted-foreground">
            <p>
              To begin onboarding, you&apos;ll need to purchase a genetic testing kit first.
              If you believe this is an error, please contact support.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Query profile and order directly for proper typing
  const [profile, order] = await Promise.all([
    prisma.userProfile.findUnique({ where: { userId: dbUser.id } }),
    prisma.order.findFirst({
      where:
        dbUser.role === "PARENT"
          ? { parentId: dbUser.id }
          : { purchaserId: dbUser.id },
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
    }),
  ]);

  // Build kits data for multi-kit support
  const kits = order?.kits?.map((kit, index) => {
    const hasChild = !!kit.child;
    const isUnborn = hasChild && kit.child?.dueDate && !kit.child?.dob;
    const isComplete = !!(kit.child && kit.consent && kit.questionnaire);
    
    return {
      id: kit.id,
      kitNumber: index + 1,
      kitType: 'Genetic Testing Kit',
      isComplete,
      isUnborn: !!isUnborn,
    };
  }) || [];

  // Transform db user to component props format
  const user = {
    email: dbUser.email,
    id: dbUser.id,
    profile: profile ? {
      firstName: profile.firstName,
      lastName: profile.lastName,
      address: profile.address,
      addressLine2: profile.addressLine2 || undefined,
      city: profile.city,
      state: profile.state,
      zipCode: profile.zipCode,
      phone: profile.phone,
    } : undefined,
  };

  // Initial data including kits
  const initialData = {
    kits,
    hasMultipleKits: kits.length > 1,
    selectedKitId: kits.length === 1 ? kits[0]?.id : null,
  };

  return <OnboardingV2 user={user} orderId={order?.id} initialData={initialData} />;
}
