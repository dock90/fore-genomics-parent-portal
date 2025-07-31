// Feature flags configuration
export const FEATURE_FLAGS = {
  CALENDLY_INTEGRATION: process.env.NEXT_PUBLIC_ENABLE_CALENDLY === "true",
  MULTI_KIT_ORDERS: process.env.NEXT_PUBLIC_ENABLE_MULTI_KIT_ORDERS === "true",
} as const;

// Helper function to check if a feature is enabled
export function isFeatureEnabled(feature: keyof typeof FEATURE_FLAGS): boolean {
  return FEATURE_FLAGS[feature];
}

// Type-safe feature flag access
export type FeatureFlag = keyof typeof FEATURE_FLAGS;
