'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, HelpCircle } from 'lucide-react';
import { YesNoDetail } from '@/components/ui/yes-no-detail';
import type { StepProps } from '@/lib/onboarding/types';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function QuestionnaireFamilyHistoryStep({ onNext, state }: StepProps) {
  const [familyHistoryExists, setFamilyHistoryExists] = useState<boolean | 'not-sure' | null>(
    state.questionnaire.familyHistoryExists
  );
  const [details, setDetails] = useState(state.questionnaire.familyHistoryDetails);

  const handleSubmit = () => {
    if (familyHistoryExists === null) {
      return;
    }

    onNext({
      questionnaire: {
        ...state.questionnaire,
        familyHistoryExists,
        familyHistoryDetails: details,
      },
    });
  };

  useStepSubmit(handleSubmit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-14 h-14 mx-auto bg-blue-100 rounded-full flex items-center justify-center mb-3"
        >
          <Users className="w-7 h-7 text-blue-600" />
        </motion.div>
        <h1 className="text-xl font-bold text-slate-900">
          Family History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Question 2 of 3
        </p>
      </div>

      {/* Question */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.1 }}
        className="space-y-4"
      >
        <h2 className="text-lg font-medium text-slate-800">
          Is there a family history of genetic conditions?
        </h2>

        <YesNoDetail
          value={familyHistoryExists}
          onChange={setFamilyHistoryExists}
          detailValue={details}
          onDetailChange={setDetails}
          showDetailOn="yes"
          detailLabel="Please describe the conditions:"
          detailPlaceholder="Describe any known genetic conditions in your family, including which relatives are affected..."
          showNotSure
          notSureDetailLabel="Anything you'd like to share (optional):"
          notSureDetailPlaceholder="Describe in your own words..."
        />
      </motion.div>

      {/* Info Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-slate-50 rounded-xl p-4"
      >
        <div className="flex gap-3">
          <HelpCircle className="w-5 h-5 text-slate-400 shrink-0 mt-0.5" />
          <div className="text-sm text-slate-600">
            <p className="font-medium text-slate-700 mb-1">Why is this important?</p>
            <p>
              Family history helps us understand potential genetic factors. This includes
              conditions in parents, grandparents, siblings, aunts, uncles, and cousins.
              Even partial information is helpful.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
