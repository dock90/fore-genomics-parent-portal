'use client';

import { motion } from 'framer-motion';
import { Clock, Shield } from 'lucide-react';
import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { StaggerChildren, StaggerItem } from '../StepTransition';

export default function WelcomeStep({ state }: StepProps) {
  const firstName = state.firstName || 'there';

  const sections = [
    { title: 'About You', description: 'Basic information for shipping' },
    { title: 'About Your Child', description: 'Details for the genetic test' },
    { title: 'Consent', description: 'Review and sign documents' },
    { title: 'Health History', description: 'A few quick questions' },
  ];

  return (
    <StepContent
      title={`Welcome${firstName !== 'there' ? `, ${firstName}` : ''}!`}
      subtitle="Let's set up your Fore Genomics account. This will take about 5-7 minutes."
    >
      {/* Hero Image/Icon */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.1, type: 'spring', stiffness: 200 }}
        className="flex justify-center py-4"
      >
        <div className="w-24 h-24 rounded-full bg-gradient-to-br from-sky-100 to-sky-200 flex items-center justify-center">
          <span className="text-5xl">🧬</span>
        </div>
      </motion.div>

      {/* What's Ahead */}
      <div className="space-y-4 -ml-4">
        <h2 className="text-lg font-semibold text-slate-900 text-center sm:text-left ml-4">
          Here's what we'll cover
        </h2>

        <StaggerChildren className="space-y-4" staggerDelay={0.1}>
          {sections.map((section, index) => (
            <StaggerItem key={section.title}>
              <div className="flex gap-3">
                <span className="text-sm font-semibold text-slate-500 w-5 text-right flex-shrink-0 pt-0.5">
                  {index + 1}
                </span>
                <div>
                  <h3 className="text-base font-semibold text-slate-800">{section.title}</h3>
                  <p className="text-sm text-slate-500">{section.description}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>

      {/* Time Estimate */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="flex items-center justify-center gap-2 text-sm text-slate-500 pt-4"
      >
        <Clock className="w-4 h-4" />
        <span>Takes about 5-7 minutes</span>
      </motion.div>

      {/* Trust Indicators */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="flex items-center justify-center gap-6 pt-4 text-xs text-slate-400"
      >
        <div className="flex items-center gap-1">
          <Shield className="w-3.5 h-3.5" />
          <span>HIPAA Compliant</span>
        </div>
        <div className="flex items-center gap-1">
          <span>🔒</span>
          <span>Secure & Private</span>
        </div>
      </motion.div>
    </StepContent>
  );
}

