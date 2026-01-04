'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import type { OnboardingState, StepId } from './types';
import { createInitialState } from './types';
import { getVisibleSteps, getCurrentStepConfig, getProgressPercentage, getSectionProgress } from './steps-config';
import { trackOnboardingEvent, startStepTimer, getStepDuration } from './analytics';

const STORAGE_KEY = 'fore_onboarding_draft';

interface UseOnboardingOptions {
  initialData?: Partial<OnboardingState>;
  onComplete?: (state: OnboardingState) => Promise<void>;
  autoSave?: boolean;
}

interface UseOnboardingReturn {
  state: OnboardingState;
  currentStep: ReturnType<typeof getCurrentStepConfig>;
  visibleSteps: ReturnType<typeof getVisibleSteps>;
  progress: {
    percentage: number;
    currentSection: ReturnType<typeof getSectionProgress>['currentSection'];
    sectionIndex: number;
    totalSections: number;
    stepsInSection: number;
    currentStepInSection: number;
    currentStepIndex: number;
    totalSteps: number;
  };
  navigation: {
    canGoBack: boolean;
    canGoForward: boolean;
    canSkip: boolean;
    isFirstStep: boolean;
    isLastStep: boolean;
  };
  actions: {
    goNext: (data?: Partial<OnboardingState>) => void;
    goBack: () => void;
    goToStep: (stepId: StepId) => void;
    updateState: (data: Partial<OnboardingState>) => void;
    reset: () => void;
  };
  isAnimating: boolean;
}

export function useOnboarding(options: UseOnboardingOptions = {}): UseOnboardingReturn {
  const { initialData, onComplete, autoSave = true } = options;

  // Initialize state from localStorage draft or initial data
  const [state, setState] = useState<OnboardingState>(() => {
    // Try to restore from localStorage on client
    if (typeof window !== 'undefined' && autoSave) {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        if (saved) {
          const parsed = JSON.parse(saved);
          return createInitialState({ ...parsed, ...initialData });
        }
      } catch (e) {
        // Ignore parse errors
      }
    }
    return createInitialState(initialData);
  });

  const [isAnimating, setIsAnimating] = useState(false);

  // Compute derived values
  const visibleSteps = useMemo(() => getVisibleSteps(state), [state]);
  const currentStep = useMemo(() => getCurrentStepConfig(state), [state]);
  const progressPercentage = useMemo(() => getProgressPercentage(state), [state]);
  const sectionProgress = useMemo(() => getSectionProgress(state), [state]);

  // Navigation state
  const canGoBack = state.currentStepIndex > 0;
  const canGoForward = state.currentStepIndex < visibleSteps.length - 1;
  const canSkip = currentStep?.canSkip ?? false;
  const isFirstStep = state.currentStepIndex === 0;
  const isLastStep = state.currentStepIndex === visibleSteps.length - 1;

  // Auto-save to localStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && autoSave) {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
      } catch (e) {
        // Ignore storage errors
      }
    }
  }, [state, autoSave]);

  // Track step views
  useEffect(() => {
    if (currentStep) {
      startStepTimer();
      trackOnboardingEvent('step_viewed', {
        stepId: currentStep.id,
        sectionId: currentStep.section,
        stepIndex: state.currentStepIndex,
        totalSteps: visibleSteps.length,
      });
    }
  }, [currentStep?.id]);

  // Go to next step
  const goNext = useCallback(
    async (data?: Partial<OnboardingState>) => {
      if (isAnimating) return;

      const timeOnStep = getStepDuration();

      // Update state with new data
      const newState = {
        ...state,
        ...data,
        completedSteps: currentStep
          ? Array.from(new Set([...state.completedSteps, currentStep.id]))
          : state.completedSteps,
        direction: 1 as const,
      };

      // Recalculate visible steps with new state
      const newVisibleSteps = getVisibleSteps(newState);
      const currentStepInNewList = newVisibleSteps.findIndex(
        (s) => s.id === currentStep?.id
      );

      // Calculate next step index
      let nextStepIndex = currentStepInNewList + 1;

      // If we're at the end
      if (nextStepIndex >= newVisibleSteps.length) {
        // Track completion
        trackOnboardingEvent('onboarding_completed', {
          stepId: currentStep?.id,
          timeOnStep,
        });

        // Call completion handler
        if (onComplete) {
          await onComplete(newState);
        }
        return;
      }

      // Trigger animation
      setIsAnimating(true);

      // Track step completion
      trackOnboardingEvent('step_completed', {
        stepId: currentStep?.id,
        sectionId: currentStep?.section,
        timeOnStep,
      });

      // Update state with new step index
      setTimeout(() => {
        setState({
          ...newState,
          currentStepIndex: nextStepIndex,
        });
        setIsAnimating(false);
      }, 50);
    },
    [state, currentStep, isAnimating, onComplete, visibleSteps]
  );

  // Go to previous step
  const goBack = useCallback(() => {
    if (!canGoBack || isAnimating) return;

    const timeOnStep = getStepDuration();

    trackOnboardingEvent('step_back', {
      stepId: currentStep?.id,
      sectionId: currentStep?.section,
      timeOnStep,
    });

    setIsAnimating(true);

    setTimeout(() => {
      setState((prev) => ({
        ...prev,
        currentStepIndex: prev.currentStepIndex - 1,
        direction: -1,
      }));
      setIsAnimating(false);
    }, 50);
  }, [canGoBack, isAnimating, currentStep]);

  // Go to specific step (only for completed steps)
  const goToStep = useCallback(
    (stepId: StepId) => {
      const targetIndex = visibleSteps.findIndex((s) => s.id === stepId);
      if (targetIndex === -1) return;

      // Only allow going back to completed steps
      if (targetIndex >= state.currentStepIndex) return;
      if (!state.completedSteps.includes(stepId)) return;

      setIsAnimating(true);

      setTimeout(() => {
        setState((prev) => ({
          ...prev,
          currentStepIndex: targetIndex,
          direction: targetIndex < prev.currentStepIndex ? -1 : 1,
        }));
        setIsAnimating(false);
      }, 50);
    },
    [visibleSteps, state.currentStepIndex, state.completedSteps]
  );

  // Update state without navigation
  const updateState = useCallback((data: Partial<OnboardingState>) => {
    setState((prev) => ({ ...prev, ...data }));
  }, []);

  // Reset to initial state
  const reset = useCallback(() => {
    if (typeof window !== 'undefined') {
      localStorage.removeItem(STORAGE_KEY);
    }
    setState(createInitialState(initialData));
  }, [initialData]);

  return {
    state,
    currentStep,
    visibleSteps,
    progress: {
      percentage: progressPercentage,
      currentSection: sectionProgress.currentSection,
      sectionIndex: sectionProgress.sectionIndex,
      totalSections: sectionProgress.totalSections,
      stepsInSection: sectionProgress.stepsInSection,
      currentStepInSection: sectionProgress.currentStepInSection,
      currentStepIndex: state.currentStepIndex,
      totalSteps: visibleSteps.length,
    },
    navigation: {
      canGoBack,
      canGoForward,
      canSkip,
      isFirstStep,
      isLastStep,
    },
    actions: {
      goNext,
      goBack,
      goToStep,
      updateState,
      reset,
    },
    isAnimating,
  };
}

/**
 * Hook for scroll-to-enable functionality (used in consent steps)
 */
export function useScrollToEnable() {
  const [hasScrolledToBottom, setHasScrolledToBottom] = useState(false);

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = event.currentTarget;
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 10; // 10px tolerance
    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
    }
  }, [hasScrolledToBottom]);

  const reset = useCallback(() => {
    setHasScrolledToBottom(false);
  }, []);

  return {
    hasScrolledToBottom,
    handleScroll,
    reset,
  };
}

