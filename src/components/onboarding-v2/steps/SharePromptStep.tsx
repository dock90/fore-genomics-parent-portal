'use client';

import { motion } from 'framer-motion';
import { useRouter } from 'next/navigation';
import { Heart, Users, Sparkles, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { StepProps } from '@/lib/onboarding/types';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function SharePromptStep({ onNext }: StepProps) {
  const router = useRouter();

  const handleSubmit = () => {
    onNext();
  };

  useStepSubmit(handleSubmit);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="text-center">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="w-16 h-16 mx-auto bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4 shadow-lg"
        >
          <Heart className="w-8 h-8 text-white" />
        </motion.div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold text-slate-900">
            Help Other Families
          </h1>
          <p className="text-slate-600 mt-2 max-w-sm mx-auto">
            Know other parents who might benefit from genetic screening? 
            Spread the word and help more families gain insights into their child&apos;s health.
          </p>
        </motion.div>
      </div>

      {/* Benefits Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-5 border border-purple-100"
      >
        <h3 className="font-semibold text-purple-900 mb-3">
          Why share with friends and family?
        </h3>
        <ul className="space-y-3 text-sm text-purple-700">
          <li className="flex items-start gap-3">
            <Users className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <span>Help other parents make informed decisions about their child&apos;s health</span>
          </li>
          <li className="flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <span>Early detection of genetic conditions can lead to better outcomes</span>
          </li>
          <li className="flex items-start gap-3">
            <Heart className="w-5 h-5 text-purple-500 flex-shrink-0 mt-0.5" />
            <span>Build a healthier community together, one family at a time</span>
          </li>
        </ul>
      </motion.div>

      {/* Coming Soon Note */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="bg-slate-50 rounded-xl p-4 border border-slate-200 text-center"
      >
        <p className="text-sm text-slate-600">
          Referral program coming soon! We&apos;ll notify you when it&apos;s available.
        </p>
      </motion.div>

      {/* Action Buttons */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="space-y-3 pt-4"
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
