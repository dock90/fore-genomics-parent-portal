import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextResponse } from 'next/server'

const isAdminRoute = createRouteMatcher(['/admin(.*)'])
const isParentInvitationRoute = createRouteMatcher(['/onboarding/parent-invitation(.*)'])
const isDashboardRoute = createRouteMatcher(['/dashboard(.*)'])

export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth()
  const url = new URL(req.url)
  
  // Protect all routes starting with `/admin`
  if (isAdminRoute(req) && ((await auth()).sessionClaims?.metadata as any)?.role !== 'ADMIN') {
    const redirectUrl = new URL('/', req.url)
    return NextResponse.redirect(redirectUrl)
  }
  
  // Redirect unauthenticated users on parent invitation route to sign-in
  // Invited users typically don't have accounts yet
  if (isParentInvitationRoute(req) && !userId) {
    const signInUrl = new URL('/sign-in', req.url)
    signInUrl.searchParams.set('redirect_url', url.href)
    return NextResponse.redirect(signInUrl)
  }
  
  // Note: We no longer block unborn child users from accessing the dashboard
  // They now have a special dashboard view that shows their due date
  
  return NextResponse.next()
})

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
}