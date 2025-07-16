import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardContent from '@/components/DashboardContent';
import UnbornChildDashboard from '@/components/UnbornChildDashboard';

export default async function DashboardPage() {
  console.log('=== DASHBOARD PAGE LOADING ===');
  const { userId, sessionClaims } = await auth();
  console.log('Dashboard - UserId:', userId);
  console.log('Dashboard - SessionClaims:', sessionClaims);
  
  if (!userId) {
    console.log('Dashboard - No userId, redirecting to sign-in');
    redirect('/sign-in');
  }

  // Get user email from Clerk
  const client = await clerkClient();
  const clerkUser = await client.users.getUser(userId);
  const userEmail = clerkUser.emailAddresses[0]?.emailAddress;
  console.log('Dashboard - UserEmail:', userEmail);
  
  if (!userEmail) {
    console.log('Dashboard - No userEmail, redirecting to onboarding');
    redirect('/onboarding');
  }

  // Get user data from database by email
  console.log('Dashboard - Querying database for email:', userEmail);
  const dbUser = await prisma.user.findFirst({
    where: { email: userEmail },
    include: {
      profile: true,
      children: true,
      consents: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
      questionnaires: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });
  console.log('Dashboard - Database user found:', !!dbUser);

  // If user doesn't exist in database but has onboardingComplete in Clerk metadata,
  // there's a data inconsistency - redirect to onboarding to fix it
  if (!dbUser) {
    console.log('Dashboard - User not found in database, redirecting to onboarding');
    redirect('/onboarding');
  }

  // Check if user has an unborn child (child with dueDate but no firstName)
  const unbornChild = dbUser.children.find(child => 
    child.dueDate && !child.firstName && !child.lastName
  );
  
  if (unbornChild) {
    console.log('Dashboard - User has unborn child, showing unborn child dashboard');
    return (
      <div className="min-h-screen bg-background">
        <UnbornChildDashboard user={dbUser} unbornChild={unbornChild} />
      </div>
    );
  }

  // Get latest order for the user
  const latestOrder = await prisma.order.findFirst({
    where: { userId: dbUser.id },
    orderBy: { createdAt: 'desc' }
  });

  return (
    <div className="min-h-screen bg-background">
      <DashboardContent user={dbUser} order={latestOrder} />
    </div>
  );
} 