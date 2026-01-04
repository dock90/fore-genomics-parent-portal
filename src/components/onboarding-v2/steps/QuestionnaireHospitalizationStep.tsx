'use client';

import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';

// Placeholder - Will be implemented in Sprint 4
export default function QuestionnaireHospitalizationStep({ onNext, state }: StepProps) {
  return (
    <StepContent
      title="Medical History"
    >
      <div className="text-center py-12 text-slate-500">
        <p>Questionnaire hospitalization step will be implemented in Sprint 4</p>
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

