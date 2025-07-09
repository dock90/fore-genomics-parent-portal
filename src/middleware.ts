import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server'
import { NextRequest, NextResponse } from 'next/server'

const isPublicRoute = createRouteMatcher([
    '/sign-in(.*)',
    '/sign-up(.*)',
])

export default clerkMiddleware(async (auth, req) => {
  console.log('=== MIDDLEWARE CALLED ===');
  console.log('URL:', req.url);
  console.log('Method:', req.method);
  
  const { userId, redirectToSignIn } = await auth()
  console.log('UserId:', userId);
  console.log('Is public route:', isPublicRoute(req));

  // Redirect unauthenticated users to sign-in
  if (!userId && !isPublicRoute(req)) {
    console.log('Redirecting to sign-in');
    return redirectToSignIn({ returnBackUrl: req.url })
  }

  // Allow access to all routes for authenticated users
  console.log('Allowing access to:', req.url);
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