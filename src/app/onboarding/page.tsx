import { auth } from "@clerk/nextjs/server";
import { getDbUser } from "@/lib/user-service";
import { OnboardingV2 } from "@/components/onboarding-v2";

export default async function OnboardingPage() {
  const { userId } = await auth();

  if (!userId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-slate-500">Not authenticated</p>
      </div>
    );
  }

  // Get database user - uses clerkId internally but returns user with database ID
  const dbUser = await getDbUser(userId, {
    profile: true,
    parentOrders: {
      orderBy: { createdAt: 'desc' },
      include: {
        kits: {
          include: {
            child: true,
            consent: true,
            questionnaire: true,
          },
        },
      },
    },
    purchaserOrders: {
      orderBy: { createdAt: 'desc' },
      include: {
        kits: {
          include: {
            child: true,
            consent: true,
            questionnaire: true,
          },
        },
      },
    },
  });

  // Get the most recent order
  const order = dbUser?.parentOrders[0] || dbUser?.purchaserOrders[0];

  // Build kits data for multi-kit support
  const kits = order?.kits?.map((kit, index) => ({
    id: kit.id,
    kitNumber: index + 1,
    kitType: 'Genetic Testing Kit',
    isComplete: !!(kit.child && kit.consent && kit.questionnaire),
  })) || [];

  // Transform db user to component props format
  const user = dbUser ? {
    email: dbUser.email,
    id: dbUser.id,
    profile: dbUser.profile ? {
      firstName: dbUser.profile.firstName,
      lastName: dbUser.profile.lastName,
      address: dbUser.profile.address,
      addressLine2: dbUser.profile.addressLine2 || undefined,
      city: dbUser.profile.city,
      state: dbUser.profile.state,
      zipCode: dbUser.profile.zipCode,
      phone: dbUser.profile.phone,
    } : undefined,
  } : null;

  // Initial data including kits
  const initialData = {
    kits,
    hasMultipleKits: kits.length > 1,
    selectedKitId: kits.length === 1 ? kits[0]?.id : null,
  };

  return <OnboardingV2 user={user} orderId={order?.id} initialData={initialData} />;
}
