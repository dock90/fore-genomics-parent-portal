import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check if user is an admin and redirect to admin dashboard
  if ((sessionClaims?.metadata as any)?.role === 'ADMIN') {
    redirect('/admin')
  }

  // Get user email from Clerk
  const client = await clerkClient()
  const clerkUser = await client.users.getUser(userId)
  const userEmail = clerkUser.emailAddresses[0]?.emailAddress

  if (!userEmail) {
    redirect('/onboarding')
  }

  // Check if user exists in database and has an order
  const dbUser = await prisma.user.findFirst({
    where: { email: userEmail },
    include: {
      orders: {
        orderBy: { createdAt: 'desc' },
        take: 1
      },
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
  })

  // If user exists and has an order
  if (dbUser && dbUser.orders.length > 0) {
    const latestOrder = dbUser.orders[0]
    
    // If order is in ORDER_RECEIVED status, user needs to complete onboarding
    if (latestOrder.status === 'ORDER_RECEIVED' as any) {
      return <>{children}</>
    }
    
    // If order is in ONBOARDING_COMPLETED or later status, user has completed onboarding
    if (latestOrder.status === 'ONBOARDING_COMPLETED' as any || 
        latestOrder.status === 'PREPARING_ORDER' as any ||
        latestOrder.status === 'SHIPPED_TO_USER' as any ||
        latestOrder.status === 'DELIVERED_AWAITING_RETURN' as any ||
        latestOrder.status === 'SHIPPED_TO_LAB' as any ||
        latestOrder.status === 'RECEIVED_IN_PROCESS' as any ||
        latestOrder.status === 'COMPLETE_REPORT_DELIVERED' as any) {
      redirect('/dashboard')
    }
  }

  // If user doesn't exist in database, allow onboarding (normal flow)
  if (!dbUser) {
    return <>{children}</>
  }

  // If user exists but has no orders, allow onboarding (normal flow)
  if (dbUser.orders.length === 0) {
    return <>{children}</>
  }

  // If we get here, user has completed onboarding and has orders in later status
  // Redirect to dashboard
  redirect('/dashboard')
}