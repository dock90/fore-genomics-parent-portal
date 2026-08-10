// Feature flags configuration
export const FEATURE_FLAGS = {
  CALENDLY_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_CALENDLY === "true",
  // @TODO Remove this flag once Google is enabled on the Clerk PRODUCTION
  // instance. Ideal solution: read the enabled social connections from Clerk at
  // runtime instead of an env flag. Workaround because production Clerk has no
  // Google connection yet (custom Google Cloud OAuth credentials required), and
  // calling signIn.authenticateWithRedirect there fails with
  // "oauth_google does not match one of the allowed values for parameter strategy".
  // The dev instance already has it enabled, so this is `true` in .env.local.
  // Ticket: none filed yet.
  GOOGLE_SIGN_IN: process.env.NEXT_PUBLIC_ENABLE_GOOGLE_SIGN_IN === "true",
  // NOTE: Fore Explore used to live here as
  //   EXPLORE: process.env.NEXT_PUBLIC_ENABLE_EXPLORE !== "false"
  // — a flag that defaulted to ON, which is how the unlaunched Explore CTA
  // reached a real customer. Explore access is now an explicit, fail-closed
  // email allowlist in src/lib/explore-access.ts (EXPLORE_ALLOWED_EMAILS).
  // NEXT_PUBLIC_ENABLE_EXPLORE is no longer read anywhere.
} as const;

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

// Type-safe feature flag access
export type FeatureFlag = keyof typeof FEATURE_FLAGS;
