// Feature flags configuration
export const FEATURE_FLAGS = {
  CALENDLY_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_CALENDLY === "true",
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
