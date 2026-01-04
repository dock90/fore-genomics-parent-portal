'use client';

import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';

// Placeholder - Will be implemented in Sprint 3
export default function ConsentIntroStep({ onNext, state }: StepProps) {
  return (
    <StepContent
      title="Review & Sign Consent"
      subtitle="You'll review 3 important documents"
    >
      <div className="text-center py-12 text-slate-500">
        <p>Consent intro step will be implemented in Sprint 3</p>
        <button
          onClick={() => onNext()}
          className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg"
        >
          Continue (Placeholder)
        </button>
      </div>
    </StepContent>
  );
}

