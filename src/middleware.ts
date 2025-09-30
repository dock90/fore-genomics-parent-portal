import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isAdminRoute = createRouteMatcher(["/admin(.*)"]);
const isCounselorRoute = createRouteMatcher(["/counselor(.*)"]);
const isParentInvitationRoute = createRouteMatcher([
  "/onboarding/parent-invitation(.*)",
]);
const isDashboardRoute = createRouteMatcher(["/dashboard(.*)"]);
const isCronRoute = createRouteMatcher(["/api/cron(.*)"]);
const isPublicApiRoute = createRouteMatcher(["/api/public(.*)"]);

export default clerkMiddleware(async (auth, req) => {
  try {
    const { userId } = await auth();
    const url = new URL(req.url);

  // Skip authentication for cron routes and public API routes - they use their own security
  if (isCronRoute(req) || isPublicApiRoute(req)) {
    return NextResponse.next();
  }

  // Protect all routes starting with `/admin`
  if (
    isAdminRoute(req) &&
    ((await auth()).sessionClaims?.metadata as any)?.role !== "ADMIN"
  ) {
    const redirectUrl = new URL("/", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Protect all routes starting with `/counselor`
  if (
    isCounselorRoute(req) &&
    ((await auth()).sessionClaims?.metadata as any)?.role !== "COUNSELOR"
  ) {
    const redirectUrl = new URL("/", req.url);
    return NextResponse.redirect(redirectUrl);
  }

  // Redirect unauthenticated users on parent invitation route to sign-in
  // Invited users typically don't have accounts yet
  if (isParentInvitationRoute(req) && !userId) {
    const signInUrl = new URL("/sign-in", req.url);
    signInUrl.searchParams.set("redirect_url", url.href);
    return NextResponse.redirect(signInUrl);
  }

  // Note: We no longer block unborn child users from accessing the dashboard
  // They now have a special dashboard view that shows their due date

  return NextResponse.next();
  } catch (error) {
    console.error('Middleware error:', error);
    // Allow the request to proceed if middleware fails
    return NextResponse.next();
  }
});

export const config = {
  matcher: [
    // Only protect specific routes that need authentication
    "/",
    "/admin(.*)",
    "/counselor(.*)", 
    "/dashboard(.*)",
    "/onboarding(.*)",
    "/(api|trpc)(.*)",
  ],
};
