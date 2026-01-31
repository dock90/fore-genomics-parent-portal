'use client';

import { motion } from 'framer-motion';
import { Clock, FileText, Heart, Shield } from 'lucide-react';
import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { StaggerChildren, StaggerItem } from '../StepTransition';

export default function WelcomeStep({ state }: StepProps) {
  const firstName = state.firstName || 'there';

  const sections = [
    {
      icon: Heart,
      title: 'About You',
      description: 'Basic information for shipping',
      color: 'text-rose-500',
      bgColor: 'bg-rose-50',
    },
    {
      icon: FileText,
      title: 'About Your Child',
      description: 'Details for the genetic test',
      color: 'text-sky-500',
      bgColor: 'bg-sky-50',
    },
    {
      icon: Shield,
      title: 'Consent',
      description: 'Review and sign documents',
      color: 'text-violet-500',
      bgColor: 'bg-violet-50',
    },
    {
      icon: Clock,
      title: 'Health History',
      description: 'A few quick questions',
      color: 'text-amber-500',
      bgColor: 'bg-amber-50',
    },
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
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900 text-center sm:text-left">
          Here's what we'll cover
        </h2>

        <StaggerChildren className="space-y-3" staggerDelay={0.1}>
          {sections.map((section, index) => (
            <StaggerItem key={section.title}>
              <motion.div
                className="flex items-center gap-4 p-4 rounded-xl border border-slate-200 bg-white hover:border-slate-300 transition-colors"
                whileHover={{ scale: 1.01 }}
                whileTap={{ scale: 0.99 }}
              >
                <div className={`w-12 h-12 rounded-xl ${section.bgColor} flex items-center justify-center flex-shrink-0`}>
                  <section.icon className={`w-6 h-6 ${section.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">
                      {index + 1}
                    </span>
                    <h3 className="font-medium text-slate-900">{section.title}</h3>
                  </div>
                  <p className="text-sm text-slate-500 mt-0.5">{section.description}</p>
                </div>
              </motion.div>
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

