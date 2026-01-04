'use client';

import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';

// Placeholder - Will be implemented in Sprint 2
export default function ChildEthnicityStep({ onNext, state }: StepProps) {
  return (
    <StepContent
      title="What is your child's ethnicity?"
      subtitle="Select all that apply"
    >
      <div className="text-center py-12 text-slate-500">
        <p>Child ethnicity step will be implemented in Sprint 2</p>
        <button
          onClick={() => onNext({ childEthnicity: ['White'] })}
          className="mt-4 px-4 py-2 bg-sky-500 text-white rounded-lg"
        >
          Continue (Placeholder)
        </button>
      </div>
    </StepContent>
  );
}

