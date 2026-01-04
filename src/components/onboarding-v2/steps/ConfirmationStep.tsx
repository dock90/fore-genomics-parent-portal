'use client';

import { motion } from 'framer-motion';
import { CheckCircle, ArrowRight, Package, TestTube, FileText, Video } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { StepProps } from '@/lib/onboarding/types';
import { StaggerChildren, StaggerItem, AnimatedCheckmark } from '../StepTransition';

export default function ConfirmationStep({ state }: StepProps) {
  const router = useRouter();
  const firstName = state.firstName || 'there';

  const nextSteps = [
    {
      icon: Package,
      title: 'Kit ships in 2-3 days',
      description: 'You\'ll receive tracking info via email',
    },
    {
      icon: TestTube,
      title: 'Collect sample & return',
      description: 'Easy at-home cheek swab collection',
    },
    {
      icon: FileText,
      title: 'Results in 4-6 weeks',
      description: 'Comprehensive genetic analysis',
    },
    {
      icon: Video,
      title: 'Genetic counseling session',
      description: 'Review results with an expert',
    },
  ];

  return (
    <div className="space-y-8">
      {/* Celebration Header */}
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-center space-y-4"
      >
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-20 h-20 rounded-full bg-gradient-to-br from-emerald-400 to-emerald-600 flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <AnimatedCheckmark className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Title */}
        <div>
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="text-3xl sm:text-4xl font-bold text-slate-900"
          >
            You're all set, {firstName}!
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="text-lg text-slate-600 mt-2"
          >
            Your onboarding is complete
          </motion.p>
        </div>
      </motion.div>

      {/* Checklist of completed items */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-emerald-50 border border-emerald-100 rounded-2xl p-6"
      >
        <h3 className="font-semibold text-emerald-800 mb-3">Completed</h3>
        <div className="space-y-2">
          {['Your information', 'Child details', 'Consent signed', 'Health history'].map((item) => (
            <div key={item} className="flex items-center gap-2 text-emerald-700">
              <CheckCircle className="w-4 h-4 text-emerald-500" />
              <span className="text-sm">{item}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* What's Next Timeline */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-slate-900">What happens next</h2>

        <StaggerChildren staggerDelay={0.1} className="space-y-3">
          {nextSteps.map((step, index) => (
            <StaggerItem key={step.title}>
              <div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl">
                <div className="flex items-center justify-center w-12 h-12 rounded-full bg-sky-100 flex-shrink-0">
                  <step.icon className="w-6 h-6 text-sky-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-slate-400">{index + 1}</span>
                    <h4 className="font-medium text-slate-900">{step.title}</h4>
                  </div>
                  <p className="text-sm text-slate-500">{step.description}</p>
                </div>
              </div>
            </StaggerItem>
          ))}
        </StaggerChildren>
      </div>

      {/* Action Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.8 }}
        className="pt-4"
      >
        <Button
          onClick={() => router.push('/dashboard')}
          className="w-full py-6 text-lg font-medium bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-lg shadow-sky-500/25"
        >
          Go to Dashboard
          <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </motion.div>
    </div>
  );
}

