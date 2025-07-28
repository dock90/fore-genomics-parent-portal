import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { prisma } from '@/lib/prisma';
import DashboardContent from '@/components/DashboardContent';
import UnbornChildDashboard from '@/components/UnbornChildDashboard';

export default async function DashboardPage() {
  const { userId, sessionClaims } = await auth();
  
  if (!userId) {
    redirect('/sign-in');
  }

  // Check if user is an admin and redirect to admin dashboard
  if (sessionClaims?.metadata?.role === 'ADMIN') {
    redirect('/admin');
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
    redirect('/');
  }
  
  if (!userEmail) {
    redirect('/onboarding');
  }

  // Get user data from database by email
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
      },
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 1
      }
    }
  });

  // If user doesn't exist in database, redirect to onboarding
  if (!dbUser) {
    redirect('/onboarding');
  }

  // Check if user has completed onboarding by checking order status
  if (dbUser.orders.length > 0) {
    const latestOrder = dbUser.orders[0];
    
    // If order is in ORDER_RECEIVED status, user needs to complete onboarding
    if (latestOrder.status === 'ORDER_RECEIVED' as any) {
      redirect('/onboarding');
    }
  } else {
    // If user has no orders, redirect to onboarding
    redirect('/onboarding');
  }

  // Check if user has an unborn child (child with dueDate but no firstName)
  const unbornChild = dbUser.children.find(child => 
    child.dueDate && !child.firstName && !child.lastName
  );
  
  if (unbornChild) {
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