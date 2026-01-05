'use client';

import { motion } from 'framer-motion';
import { Shield, FileText, Stethoscope, Video, Clock } from 'lucide-react';
import type { StepProps } from '@/lib/onboarding/types';
import { useStepSubmit } from '@/lib/onboarding/step-context';

const sections = [
  {
    icon: FileText,
    title: 'Fore Genomics Services',
    description: 'How we handle your data, communication preferences, and our service terms',
    time: '2 min read',
  },
  {
    icon: Stethoscope,
    title: 'Genetic Testing Consent',
    description: 'Understanding the genetic testing process, benefits, limitations, and results',
    time: '3 min read',
  },
  {
    icon: Video,
    title: 'Telehealth Services',
    description: 'How remote genetic counseling works and your rights during telehealth visits',
    time: '2 min read',
  },
];

export default function ConsentIntroStep({ onNext }: StepProps) {
  const handleSubmit = () => {
    onNext();
  };

  useStepSubmit(handleSubmit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center space-y-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 mx-auto bg-sky-100 rounded-full flex items-center justify-center"
        >
          <Shield className="w-8 h-8 text-sky-600" />
        </motion.div>

        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold text-slate-900">
            Informed Consent
          </h1>
          <p className="text-slate-600 mt-2">
            Before we proceed, we need your consent for the genetic testing services.
            This is required by law and protects both you and your child.
          </p>
        </motion.div>
      </div>

      {/* What to expect */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <h2 className="text-sm font-semibold text-slate-700 uppercase tracking-wide">
          What you'll review
        </h2>

        <div className="space-y-3">
          {sections.map((section, index) => (
            <motion.div
              key={section.title}
              initial={{ x: -20, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              transition={{ delay: 0.3 + index * 0.1 }}
              className="flex gap-4 p-4 bg-white rounded-xl border border-slate-200"
            >
              <div className="w-10 h-10 shrink-0 bg-slate-100 rounded-lg flex items-center justify-center">
                <section.icon className="w-5 h-5 text-slate-600" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="font-medium text-slate-900">{section.title}</h3>
                <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>
                <div className="flex items-center gap-1 mt-2 text-xs text-slate-400">
                  <Clock className="w-3 h-3" />
                  {section.time}
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Total time estimate */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="bg-amber-50 border border-amber-200 rounded-xl p-4"
      >
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 shrink-0 bg-amber-100 rounded-full flex items-center justify-center">
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div>
            <h3 className="font-medium text-amber-900">About 7 minutes total</h3>
            <p className="text-sm text-amber-700 mt-1">
              You must scroll through each section completely before you can accept.
              This ensures you've had the opportunity to read the important information.
            </p>
          </div>
        </div>
      </motion.div>

      {/* Legal notice */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
        className="text-xs text-slate-400 text-center"
      >
        By continuing, you acknowledge that you are the parent or legal guardian
        authorized to provide consent for this child.
      </motion.p>
    </div>
  );
}
