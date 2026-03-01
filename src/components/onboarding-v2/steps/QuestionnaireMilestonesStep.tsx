'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Baby, HelpCircle } from 'lucide-react';
import { YesNoDetail } from '@/components/ui/yes-no-detail';
import type { StepProps } from '@/lib/onboarding/types';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function QuestionnaireMilestonesStep({ onNext, state }: StepProps) {
  const [milestonesOnTime, setMilestonesOnTime] = useState<boolean | 'not-sure' | null>(
    state.questionnaire.milestonesOnTime
  );
  const [details, setDetails] = useState(state.questionnaire.milestonesDetails);

  const handleSubmit = () => {
    if (milestonesOnTime === null) {
      return;
    }

    onNext({
      questionnaire: {
        ...state.questionnaire,
        milestonesOnTime,
        milestonesDetails: details,
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
          className="w-14 h-14 mx-auto bg-purple-100 rounded-full flex items-center justify-center mb-3"
        >
          <Baby className="w-7 h-7 text-purple-600" />
        </motion.div>
        <h1 className="text-xl font-bold text-slate-900">
          Developmental Milestones
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Question 1 of 3
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
          Has your child met all major developmental milestones on time?
        </h2>

        <YesNoDetail
          value={milestonesOnTime}
          onChange={setMilestonesOnTime}
          detailValue={details}
          onDetailChange={setDetails}
          showDetailOn="no"
          detailLabel="Please describe any concerns:"
          detailPlaceholder="Describe any developmental delays or concerns you've noticed..."
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
            <p className="font-medium text-slate-700 mb-1">What are developmental milestones?</p>
            <p>
              These include skills like sitting up, crawling, walking, speaking first words,
              and social interactions. Most children reach these at similar ages, though
              some variation is normal.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
