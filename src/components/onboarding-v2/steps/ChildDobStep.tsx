'use client';

import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';

// Placeholder - Will be implemented in Sprint 2
export default function ChildDobStep({ onNext, state }: StepProps) {
  return (
    <StepContent
      title="When was your child born?"
    >
      <div className="text-center py-12 text-slate-500">
        <p>Child DOB step will be implemented in Sprint 2</p>
        <button
          onClick={() => onNext({ childDob: '2023-01-01' })}
          className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg"
        >
          Continue (Placeholder)
        </button>
      </div>
    </StepContent>
  );
}

