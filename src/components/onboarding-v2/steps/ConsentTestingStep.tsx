'use client';

import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';

// Placeholder - Will be implemented in Sprint 3
export default function ConsentTestingStep({ onNext, state }: StepProps) {
  return (
    <StepContent
      title="Part 2 of 3: Genetic Testing Consent"
      subtitle="What genetic testing involves and what results may reveal"
    >
      <div className="text-center py-12 text-slate-500">
        <p>Consent testing step will be implemented in Sprint 3</p>
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

