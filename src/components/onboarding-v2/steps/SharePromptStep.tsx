'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Share2, Copy, Check, Mail, MessageCircle, Twitter, Facebook } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import type { StepProps } from '@/lib/onboarding/types';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function SharePromptStep({ onNext, state }: StepProps) {
  const [copied, setCopied] = useState(false);

  // Referral link - in production this would be dynamically generated
  const referralLink = `https://foregenomics.com/ref/${state.userId || 'demo'}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Silently fail
    }
  };

  const shareOptions = [
    {
      name: 'Email',
      icon: Mail,
      color: 'bg-blue-100 text-blue-600',
      action: () => {
        window.open(`mailto:?subject=Check out Fore Genomics&body=I just signed up for Fore Genomics Pediatric Health Screen! You can learn more here: ${referralLink}`);
      },
    },
    {
      name: 'Text',
      icon: MessageCircle,
      color: 'bg-emerald-100 text-emerald-600',
      action: () => {
        window.open(`sms:?body=I just signed up for Fore Genomics Pediatric Health Screen! Check it out: ${referralLink}`);
      },
    },
    {
      name: 'Twitter',
      icon: Twitter,
      color: 'bg-sky-100 text-sky-600',
      action: () => {
        window.open(`https://twitter.com/intent/tweet?text=I just signed up for Fore Genomics Pediatric Health Screen!&url=${encodeURIComponent(referralLink)}`);
      },
    },
    {
      name: 'Facebook',
      icon: Facebook,
      color: 'bg-indigo-100 text-indigo-600',
      action: () => {
        window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(referralLink)}`);
      },
    },
  ];

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
          <Share2 className="w-8 h-8 text-white" />
        </motion.div>
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h1 className="text-2xl font-bold text-slate-900">
            Share the Gift of Knowledge
          </h1>
          <p className="text-slate-600 mt-2 max-w-sm mx-auto">
            Know other parents who might benefit? Share your referral link
            and help more families gain insights into their child's health.
          </p>
        </motion.div>
      </div>

      {/* Referral Link */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
        className="space-y-3"
      >
        <label className="text-sm font-medium text-slate-700">
          Your referral link
        </label>
        <div className="flex gap-2">
          <Input
            value={referralLink}
            readOnly
            className="flex-1 bg-slate-50 text-slate-600"
          />
          <Button
            variant="outline"
            size="icon"
            onClick={handleCopy}
            className="shrink-0"
          >
            {copied ? (
              <Check className="w-4 h-4 text-emerald-600" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </Button>
        </div>
      </motion.div>

      {/* Share Options */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="space-y-3"
      >
        <label className="text-sm font-medium text-slate-700">
          Share via
        </label>
        <div className="grid grid-cols-4 gap-3">
          {shareOptions.map((option, index) => (
            <motion.button
              key={option.name}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.4 + index * 0.05 }}
              onClick={option.action}
              className="flex flex-col items-center gap-2 p-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition-colors"
            >
              <div className={`w-10 h-10 rounded-full ${option.color} flex items-center justify-center`}>
                <option.icon className="w-5 h-5" />
              </div>
              <span className="text-xs text-slate-600">{option.name}</span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Benefits Card */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.5 }}
        className="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl p-4 border border-purple-100"
      >
        <h3 className="font-semibold text-purple-900 mb-2">
          Why share?
        </h3>
        <ul className="space-y-2 text-sm text-purple-700">
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
            Help other parents make informed decisions
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
            Early detection can change outcomes
          </li>
          <li className="flex items-center gap-2">
            <span className="w-1.5 h-1.5 bg-purple-400 rounded-full" />
            Build a healthier community together
          </li>
        </ul>
      </motion.div>

      {/* Skip Option */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6 }}
        className="text-center"
      >
        <Button
          variant="ghost"
          onClick={() => onNext()}
          className="text-slate-500 hover:text-slate-700"
        >
          Skip for now
        </Button>
      </motion.div>
    </div>
  );
}
