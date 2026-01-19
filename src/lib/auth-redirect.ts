import { auth } from "@clerk/nextjs/server";

/**
 * Determines the appropriate redirect URL based on user role.
 * For regular users, always sends to /onboarding which then decides
 * whether to redirect to /dashboard based on complete checks.
 * This ensures a single source of truth for the redirect decision.
 */
export async function getAuthRedirectUrl(): Promise<string> {
  const { userId, sessionClaims } = await auth();

  // Not authenticated - go to sign-in
  if (!userId) {
    return "/sign-in";
  }

  const role = (sessionClaims?.metadata as any)?.role;

  // Admin users go to admin dashboard
  if (role === "ADMIN") {
    return "/admin";
  }

  // Counselor users go to counselor dashboard
  if (role === "COUNSELOR") {
    return "/counselor";
  }

  // For regular users, always go to onboarding first
  // The onboarding layout will redirect to dashboard if appropriate
  return "/onboarding";
}
