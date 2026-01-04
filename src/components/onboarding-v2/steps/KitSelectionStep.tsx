'use client';

import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';

// Placeholder - Will be implemented in Sprint 2
export default function KitSelectionStep({ onNext, state }: StepProps) {
  return (
    <StepContent
      title="Select a kit to set up"
      subtitle="You have multiple kits to complete"
    >
      <div className="text-center py-12 text-slate-500">
        <p>Kit selection will be implemented in Sprint 2</p>
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

