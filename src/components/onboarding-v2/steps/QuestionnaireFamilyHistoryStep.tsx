'use client';

import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';

// Placeholder - Will be implemented in Sprint 4
export default function QuestionnaireFamilyHistoryStep({ onNext, state }: StepProps) {
  return (
    <StepContent
      title="Family Health History"
    >
      <div className="text-center py-12 text-slate-500">
        <p>Questionnaire family history step will be implemented in Sprint 4</p>
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

