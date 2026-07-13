// Feature flags configuration
export const FEATURE_FLAGS = {
  CALENDLY_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_CALENDLY === "true",
  // Fore Explore genome explorer (explore.foregenomics.com). Defaults on unless
  // explicitly disabled, so the CTA still shows without extra env setup.
  EXPLORE: process.env.NEXT_PUBLIC_ENABLE_EXPLORE !== "false",
} as const;

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

// Type-safe feature flag access
export type FeatureFlag = keyof typeof FEATURE_FLAGS;
