'use client';

import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';

// Placeholder - Will be implemented in Sprint 5
export default function SharePromptStep({ onNext, state }: StepProps) {
  return (
    <StepContent
      title="Share with Friends"
    >
      <div className="text-center py-12 text-slate-500">
        <p>Share prompt step will be implemented in Sprint 5</p>
        <button
          onClick={() => onNext()}
          className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg"
        >
          Skip
        </button>
      </div>
    </StepContent>
  );
}

