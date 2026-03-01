'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Building2, HelpCircle } from 'lucide-react';
import { YesNoDetail } from '@/components/ui/yes-no-detail';
import type { StepProps } from '@/lib/onboarding/types';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function QuestionnaireHospitalizationStep({ onNext, state }: StepProps) {
  const [hospitalizationHistory, setHospitalizationHistory] = useState<boolean | 'not-sure' | null>(
    state.questionnaire.hospitalizationHistory
  );
  const [details, setDetails] = useState(state.questionnaire.hospitalizationDetails);

  const handleSubmit = () => {
    if (hospitalizationHistory === null) {
      return;
    }

    onNext({
      questionnaire: {
        ...state.questionnaire,
        hospitalizationHistory,
        hospitalizationDetails: details,
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
          className="w-14 h-14 mx-auto bg-amber-100 rounded-full flex items-center justify-center mb-3"
        >
          <Building2 className="w-7 h-7 text-amber-600" />
        </motion.div>
        <h1 className="text-xl font-bold text-slate-900">
          Hospitalization History
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Question 3 of 3
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
          Has your child ever been hospitalized?
        </h2>

        <YesNoDetail
          value={hospitalizationHistory}
          onChange={setHospitalizationHistory}
          detailValue={details}
          onDetailChange={setDetails}
          showDetailOn="yes"
          detailLabel="Please describe the hospitalization:"
          detailPlaceholder="Describe the reason for hospitalization, duration, and any relevant details..."
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
            <p className="font-medium text-slate-700 mb-1">What counts as hospitalization?</p>
            <p>
              Include any overnight hospital stays, surgeries, or emergency room visits
              that resulted in admission. Routine visits and outpatient procedures
              don't need to be included.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Almost Done */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-center pt-4"
      >
        <p className="text-sm text-slate-500">
          🎉 You're almost done! Just one more step after this.
        </p>
      </motion.div>
    </div>
  );
}
