// Stubbed analytics helpers for future implementation (Mixpanel/Amplitude/PostHog)

import type { StepId, SectionId } from './types';

export type OnboardingAnalyticsEvent =
	| 'onboarding_started'
	| 'step_viewed'
	| 'step_completed'
	| 'step_skipped'
	| 'step_back'
	| 'consent_section_scrolled'
	| 'consent_section_agreed'
	| 'signature_started'
	| 'signature_completed'
	| 'signature_cleared'
	| 'onboarding_completed'
	| 'onboarding_abandoned'
	| 'educational_content_viewed'
	| 'educational_link_clicked'
	| 'share_initiated'
	| 'share_completed'
	| 'share_cancelled'
	| 'validation_error';

export interface AnalyticsProperties {
	stepId?: StepId;
	sectionId?: SectionId;
	stepIndex?: number;
	totalSteps?: number;
	timeOnStep?: number;
	errorField?: string;
	errorMessage?: string;
	shareChannel?: string;
	[key: string]: unknown;
}

/**
 * Track an onboarding analytics event
 * Currently logs to console in development, ready for integration with analytics platform
 */
export function trackOnboardingEvent(
	event: OnboardingAnalyticsEvent,
	properties?: AnalyticsProperties
): void {
	const timestamp = new Date().toISOString();
	const payload = {
		event,
		properties: {
			...properties,
			timestamp,
			source: 'onboarding_v2',
		},
	};

	if (process.env.NODE_ENV === 'development') {
		console.log('[Analytics]', event, payload.properties);
	}

	// TODO: Implement actual tracking
	// Example integrations:
	//
	// PostHog:
	// if (typeof window !== 'undefined' && window.posthog) {
	//   window.posthog.capture(event, payload.properties);
	// }
	//
	// Mixpanel:
	// if (typeof window !== 'undefined' && window.mixpanel) {
	//   window.mixpanel.track(event, payload.properties);
	// }
	//
	// Amplitude:
	// if (typeof window !== 'undefined' && window.amplitude) {
	//   window.amplitude.track(event, payload.properties);
	// }
}

/**
 * Track step timing - call when entering a step
 */
let stepStartTime: number | null = null;

export function startStepTimer(): void {
	stepStartTime = Date.now();
}

export function getStepDuration(): number {
	if (stepStartTime === null) return 0;
	return Math.round((Date.now() - stepStartTime) / 1000);
}

/**
 * Identify the user for analytics
 * Call this when user is authenticated
 */
export function identifyUser(
	userId: string,
	traits?: Record<string, unknown>
): void {
	if (process.env.NODE_ENV === 'development') {
		console.log('[Analytics] Identify user:', userId, traits);
	}

	// TODO: Implement actual identification
	// Example:
	// if (typeof window !== 'undefined' && window.posthog) {
	//   window.posthog.identify(userId, traits);
	// }
}

/**
 * Set user properties
 */
export function setUserProperties(properties: Record<string, unknown>): void {
	if (process.env.NODE_ENV === 'development') {
		console.log('[Analytics] Set user properties:', properties);
	}

	// TODO: Implement
}

/**
 * Track page/screen view
 */
export function trackPageView(
	pageName: string,
	properties?: Record<string, unknown>
): void {
	if (process.env.NODE_ENV === 'development') {
		console.log('[Analytics] Page view:', pageName, properties);
	}

	// TODO: Implement
}
