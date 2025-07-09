import { auth, clerkClient } from '@clerk/nextjs/server'
import { redirect } from 'next/navigation'
import { prisma } from '@/lib/prisma'

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const { userId, sessionClaims } = await auth()
  
  if (!userId) {
    redirect('/sign-in')
  }

  // Check if user has completed onboarding in Clerk metadata
  if (sessionClaims?.metadata.onboardingComplete === true) {
    redirect('/dashboard')
  }



  return <>{children}</>
}