import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import OnboardingWizard from '@/components/OnboardingWizard';

export default async function OnboardingPage() {
  const { userId } = await auth();
  
  if (!userId) {
    return <div>Not authenticated</div>;
  }

  // Get user email from Clerk
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

  if (!userEmail) {
    return <div>No email found</div>;
  }

  // Get database user
  const dbUser = await prisma.user.findFirst({
    where: { email: userEmail },
    include: {
      profile: true,
      parentOrders: {
        include: {
          kits: {
            include: {
              child: true,
              consent: true,
              questionnaire: true
            }
          }
        }
      },
      purchaserOrders: {
        include: {
          kits: {
            include: {
              child: true,
              consent: true,
              questionnaire: true
            }
          }
        }
      }
    }
  });

  return <OnboardingWizard user={dbUser} />;
}