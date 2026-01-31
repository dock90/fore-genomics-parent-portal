'use client';

import { ComponentType, useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import type { StepId, StepProps } from '@/lib/onboarding/types';
import { getStepComponentLoader } from '@/lib/onboarding/steps-config';
import { StepTransition } from './StepTransition';

interface StepRendererProps {
  stepId: StepId;
  stepProps: StepProps;
  direction: 1 | -1;
}

// Loading fallback component
function StepLoading() {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
      <p className="text-slate-500 text-sm">Loading...</p>
    </div>
  );
}

// Error fallback component
function StepError({ error, retry }: { error: Error; retry: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 space-y-4">
      <div className="w-16 h-16 rounded-full bg-red-100 flex items-center justify-center">
        <span className="text-2xl">⚠️</span>
      </div>
      <div className="text-center">
        <h3 className="font-medium text-slate-900">Something went wrong</h3>
        <p className="text-sm text-slate-500 mt-1">{error.message}</p>
      </div>
      <button
        onClick={retry}
        className="px-4 py-2 bg-sky-500 text-white rounded-lg text-sm font-medium hover:bg-sky-600 transition-colors"
      >
        Try again
      </button>
    </div>
  );
}

// Cache for loaded components
const componentCache = new Map<StepId, ComponentType<StepProps>>();

export function StepRenderer({ stepId, stepProps, direction }: StepRendererProps) {
  const [Component, setComponent] = useState<ComponentType<StepProps> | null>(
    () => componentCache.get(stepId) || null
  );
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(!componentCache.has(stepId));

  useEffect(() => {
    // If component is already cached, use it
    if (componentCache.has(stepId)) {
      setComponent(() => componentCache.get(stepId)!);
      setIsLoading(false);
      setError(null);
      return;
    }

    // Load the component
    setIsLoading(true);
    setError(null);

    const loader = getStepComponentLoader(stepId);
    if (!loader) {
      setError(new Error(`No component loader found for step: ${stepId}`));
      setIsLoading(false);
      return;
    }

    loader()
      .then((module) => {
        const LoadedComponent = module.default;
        componentCache.set(stepId, LoadedComponent);
        setComponent(() => LoadedComponent);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err);
        setIsLoading(false);
      });
  }, [stepId]);

  const handleRetry = () => {
    componentCache.delete(stepId);
    setError(null);
    setIsLoading(true);
    // Trigger re-load via useEffect
    setComponent(null);
  };

  if (error) {
    return <StepError error={error} retry={handleRetry} />;
  }

  if (isLoading || !Component) {
    return <StepLoading />;
  }

  return (
    <StepTransition stepKey={stepId} direction={direction}>
      <Component {...stepProps} />
    </StepTransition>
  );
}

/**
 * Preload a step component before it's needed
 */
export function preloadStep(stepId: StepId): void {
  if (componentCache.has(stepId)) return;

  const loader = getStepComponentLoader(stepId);
  if (loader) {
    loader()
      .then((module) => {
        componentCache.set(stepId, module.default);
      })
      .catch(() => {
      });
  }
}

/**
 * Preload the next N steps for smoother transitions
 */
export function preloadNextSteps(currentStepId: StepId, allStepIds: StepId[], count = 2): void {
  const currentIndex = allStepIds.indexOf(currentStepId);
  if (currentIndex === -1) return;

  for (let i = 1; i <= count; i++) {
    const nextIndex = currentIndex + i;
    if (nextIndex < allStepIds.length) {
      preloadStep(allStepIds[nextIndex]);
    }
  }
}

