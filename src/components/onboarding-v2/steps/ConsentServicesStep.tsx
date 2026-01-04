'use client';

import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';

// Placeholder - Will be implemented in Sprint 3
export default function ConsentServicesStep({ onNext, state }: StepProps) {
  return (
    <StepContent
      title="Part 1 of 3: Terms of Service"
      subtitle="How we handle your data and communicate with you"
    >
      <div className="text-center py-12 text-slate-500">
        <p>Consent services step will be implemented in Sprint 3</p>
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

