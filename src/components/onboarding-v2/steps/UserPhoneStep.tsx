'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import PhoneInput from 'react-phone-number-input/input';
import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { ShakeOnError } from '../StepTransition';

export default function UserPhoneStep({ onNext, state }: StepProps) {
  const [phone, setPhone] = useState(state.phone || '');
  const [error, setError] = useState<string | null>(null);
  const [shake, setShake] = useState(false);

  const phoneRef = useRef<HTMLInputElement>(null);

  // Auto-focus on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      phoneRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const validate = (): boolean => {
    if (!phone || phone.length < 10) {
      setError('Please enter a valid phone number');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return false;
    }
    return true;
  };

  const handleSubmit = () => {
    if (validate()) {
      onNext({ phone });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <StepContent
      title="What's your phone number?"
      subtitle="We'll text you shipping updates and appointment reminders"
      educationalTip={{
        title: 'Stay informed',
        body: "We'll only contact you about important updates regarding your order and appointments.",
        icon: '📱',
      }}
    >
      <ShakeOnError shake={shake}>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="space-y-2"
        >
          <Label htmlFor="phone" className="text-base font-medium text-slate-700">
            Phone number
          </Label>
          <PhoneInput
            ref={phoneRef}
            id="phone"
            country="US"
            value={phone}
            onChange={(value) => {
              setPhone(value || '');
              if (error) setError(null);
            }}
            onKeyDown={handleKeyDown}
            inputComponent={Input}
            placeholder="(555) 123-4567"
            className={`h-14 text-lg px-4 rounded-xl border-2 transition-all ${
              error
                ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
            }`}
            inputMode="tel"
            autoComplete="tel"
          />
          {error && (
            <motion.p
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-sm text-red-500 flex items-center gap-1"
            >
              <span>⚠️</span> {error}
            </motion.p>
          )}
        </motion.div>
      </ShakeOnError>

      {/* Privacy note */}
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-sm text-slate-500 flex items-center gap-2"
      >
        <span>🔒</span>
        Your phone number is protected and never shared with third parties.
      </motion.p>

      {/* Hidden submit button */}
      <button
        type="button"
        onClick={handleSubmit}
        className="sr-only"
        aria-label="Continue"
      >
        Continue
      </button>
    </StepContent>
  );
}

