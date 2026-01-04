'use client';

import { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useOnboarding } from '@/lib/onboarding/use-onboarding';
import { StepProvider, useStepContext } from '@/lib/onboarding/step-context';
import type { OnboardingState } from '@/lib/onboarding/types';
import { OnboardingShell } from './OnboardingShell';
import { StepRenderer, preloadNextSteps } from './StepRenderer';

interface OnboardingV2Props {
	user: {
		email: string;
		id?: string;
		profile?: {
			firstName?: string;
			lastName?: string;
			address?: string;
			addressLine2?: string;
			city?: string;
			state?: string;
			zipCode?: string;
			phone?: string;
		};
	} | null;
	orderId?: string;
	initialData?: Partial<OnboardingState>;
}

export function OnboardingV2(props: OnboardingV2Props) {
	return (
		<StepProvider>
			<OnboardingV2Inner {...props} />
		</StepProvider>
	);
}

function OnboardingV2Inner({ user, orderId, initialData }: OnboardingV2Props) {
	const router = useRouter();
	const { triggerSubmit } = useStepContext();

	// Initialize state from user data
	const computedInitialData: Partial<OnboardingState> = {
		email: user?.email || '',
		firstName: user?.profile?.firstName || '',
		lastName: user?.profile?.lastName || '',
		address: {
			street: user?.profile?.address || '',
			street2: user?.profile?.addressLine2 || '',
			city: user?.profile?.city || '',
			state: user?.profile?.state || '',
			zipCode: user?.profile?.zipCode || '',
		},
		phone: user?.profile?.phone || '',
		userId: user?.id || null,
		orderId: orderId || null,
		...initialData,
	};

	// Handle onboarding completion
	const handleComplete = useCallback(
		async (state: OnboardingState) => {
			// TODO: Save to API
			console.log('Onboarding complete:', state);

			// Navigate to dashboard
			router.push('/dashboard');
		},
		[router]
	);

	const {
		state,
		currentStep,
		visibleSteps,
		progress,
		navigation,
		actions,
		isAnimating,
	} = useOnboarding({
		initialData: computedInitialData,
		onComplete: handleComplete,
		autoSave: true,
	});

	// Preload next steps for smoother transitions
	useEffect(() => {
		if (currentStep) {
			const stepIds = visibleSteps.map((s) => s.id);
			preloadNextSteps(currentStep.id, stepIds, 2);
		}
	}, [currentStep, visibleSteps]);

	// Handle next button click - delegates to step's registered submit handler
	const handleNext = useCallback(() => {
		// For steps without validation (like Welcome), call goNext directly
		if (currentStep?.id === 'welcome') {
			actions.goNext();
		} else {
			// Trigger the step's registered submit handler
			triggerSubmit();
		}
	}, [currentStep, actions, triggerSubmit]);

	// Determine if we should hide navigation (e.g., on confirmation step)
	const hideNavigation =
		currentStep?.id === 'confirmation' || currentStep?.id === 'share-prompt';

	// Determine next button label
	const getNextLabel = () => {
		if (currentStep?.id === 'welcome') return 'Get Started';
		if (navigation.isLastStep) return 'Complete';
		return 'Continue';
	};

	if (!currentStep) {
		return (
			<div className="min-h-screen flex items-center justify-center">
				<div className="text-center">
					<div className="w-8 h-8 border-4 border-sky-500 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
					<p className="text-slate-500">Loading...</p>
				</div>
			</div>
		);
	}

	return (
		<OnboardingShell
			progress={progress}
			navigation={navigation}
			onBack={actions.goBack}
			onNext={handleNext}
			nextLabel={getNextLabel()}
			hideNavigation={hideNavigation}
		>
			<StepRenderer
				stepId={currentStep.id}
				stepProps={{
					onNext: actions.goNext,
					onBack: actions.goBack,
					state,
					isAnimating,
				}}
				direction={state.direction}
			/>
		</OnboardingShell>
	);
}
