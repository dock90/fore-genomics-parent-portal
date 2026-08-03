/**
 * Fore Explore access control — the single gate for the whole integration.
 *
 * Explore has NOT cleared content/regulatory review, so it is not a launched
 * product. Nobody reaches it unless their email is listed in
 * `EXPLORE_ALLOWED_EMAILS`. An unset or empty variable denies everyone, which is
 * deliberate: the previous gate (`NEXT_PUBLIC_ENABLE_EXPLORE !== "false"`)
 * defaulted to ON, so a fresh environment with no Explore config at all shipped
 * the CTA to customers. Any new environment, and any redeploy that loses its
 * env, must land closed instead.
 *
 * To add a tester: append their email to the variable — no code change, no
 * redeploy (this is a server-only var, read per request).
 * To kill Explore entirely: clear the variable.
 *
 * Deliberately NOT a NEXT_PUBLIC_* var — the tester list must never be inlined
 * into the client bundle. Server code passes the resulting boolean down instead
 * (see src/app/dashboard/page.tsx).
 *
 * Mirrors the shape of src/utils/approved-trf-access.ts, which gates approved
 * TRF downloads the same way.
 *
 * Kept free of top-level `@clerk/nextjs/server` imports so it is safe to import
 * from anywhere on the server — including src/lib/klaviyo.ts, which runs from
 * webhooks and crons that have no request context. `isExploreAllowedEmail` is a
 * pure function of the environment.
 */

/** Parsed, normalized allowlist. Empty when the variable is unset or blank. */
function allowedEmails(): string[] {
  return (process.env.EXPLORE_ALLOWED_EMAILS?.split(",") || [])
    .map((email) => email.trim().toLowerCase())
    .filter((email) => email.length > 0);
}

/**
 * Whether this email may use Fore Explore.
 *
 * Use this in the `/api/explore/*` routes, which already have the parent's email
 * from `getDbUser` and so need no extra Clerk round-trip.
 */
export function isExploreAllowedEmail(email?: string | null): boolean {
  if (!email) return false;
  const allowed = allowedEmails();
  if (!allowed.length) return false;
  return allowed.includes(email.trim().toLowerCase());
}

/**
 * Whether the signed-in user may use Fore Explore, resolving their email via
 * Clerk. For callers that don't already hold the db user.
 */
export async function hasExploreAccess(): Promise<boolean> {
  try {
    const { auth, clerkClient } = await import("@clerk/nextjs/server");
    const { userId } = await auth();
    if (!userId) return false;

    const client = await clerkClient();
    const user = await client.users.getUser(userId);

    return isExploreAllowedEmail(user.emailAddresses[0]?.emailAddress);
  } catch {
    // Fail closed — an identity we couldn't resolve is not an allowed one.
    return false;
  }
}

/** The configured testers, for admin/debugging surfaces only. Never sent to a client. */
export function getExploreAllowedEmails(): string[] {
  return allowedEmails();
}

/**
 * The error body every `/api/explore/*` route returns when the caller is not on
 * the allowlist. The Explore app keys its "not available yet" screen off this
 * exact code, so it must stay in sync with `lib/exploreApi.ts` in the
 * explore-foregenomics repo.
 *
 * 403 rather than 404: the routes already use 404 for "no data for this kit",
 * and Explore treats that as a normal empty state.
 */
export const EXPLORE_UNAVAILABLE = { error: "explore_unavailable" } as const;
