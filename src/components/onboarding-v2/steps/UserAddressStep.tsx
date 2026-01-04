'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { StepProps } from '@/lib/onboarding/types';
import { US_STATES } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { ShakeOnError } from '../StepTransition';
import { showValidationToast, validationMessages } from '@/lib/onboarding/validation-messages';
import { useStepSubmit } from '@/lib/onboarding/step-context';

interface AddressErrors {
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
}

export default function UserAddressStep({ onNext, state }: StepProps) {
  const [street, setStreet] = useState(state.address?.street || '');
  const [street2, setStreet2] = useState(state.address?.street2 || '');
  const [city, setCity] = useState(state.address?.city || '');
  const [selectedState, setSelectedState] = useState(state.address?.state || '');
  const [zipCode, setZipCode] = useState(state.address?.zipCode || '');
  const [errors, setErrors] = useState<AddressErrors>({});
  const [shake, setShake] = useState(false);

  const streetRef = useRef<HTMLInputElement>(null);

  // Auto-focus street on mount
  useEffect(() => {
    const timer = setTimeout(() => {
      streetRef.current?.focus();
    }, 300);
    return () => clearTimeout(timer);
  }, []);

  const validate = (): boolean => {
    const newErrors: AddressErrors = {};

    if (!street.trim()) {
      newErrors.street = 'Street address is required';
    }
    if (!city.trim()) {
      newErrors.city = 'City is required';
    }
    if (!selectedState) {
      newErrors.state = 'State is required';
    }
    if (!zipCode.trim()) {
      newErrors.zipCode = 'ZIP code is required';
    } else if (!/^\d{5}(-\d{4})?$/.test(zipCode.trim())) {
      newErrors.zipCode = 'Please enter a valid ZIP code';
    }

    setErrors(newErrors);

    if (Object.keys(newErrors).length > 0) {
      // Show friendly toast based on what's missing
      const errorCount = Object.keys(newErrors).length;
      if (errorCount > 1) {
        showValidationToast(validationMessages.userAddress.incomplete);
      } else if (newErrors.street) {
        showValidationToast(validationMessages.userAddress.street);
      } else if (newErrors.city) {
        showValidationToast(validationMessages.userAddress.city);
      } else if (newErrors.state) {
        showValidationToast(validationMessages.userAddress.state);
      } else if (newErrors.zipCode) {
        showValidationToast(validationMessages.userAddress.zipCode);
      }

      setShake(true);
      setTimeout(() => setShake(false), 500);
      return false;
    }

    return true;
  };

  const handleSubmit = () => {
    if (validate()) {
      onNext({
        address: {
          street: street.trim(),
          street2: street2.trim(),
          city: city.trim(),
          state: selectedState,
          zipCode: zipCode.trim(),
        },
      });
    }
  };

  // Handle enter key navigation
  const handleKeyDown = (e: React.KeyboardEvent, nextFieldId?: string) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (nextFieldId) {
        const nextField = document.getElementById(nextFieldId);
        nextField?.focus();
      } else {
        handleSubmit();
      }
    }
  };

  // Clear error when field is edited
  const clearError = (field: keyof AddressErrors) => {
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: undefined }));
    }
  };

  // Register submit handler with parent navigation
  useStepSubmit(handleSubmit);

  return (
    <StepContent
      title="Where should we ship your kit?"
      subtitle="Your kit will arrive in 2-3 business days"
      educationalTip={{
        title: 'Fast shipping',
        body: "We ship via USPS Priority Mail. You'll receive tracking information via email.",
        icon: '🚚',
      }}
    >
      <ShakeOnError shake={shake}>
        <div className="space-y-5">
          {/* Street Address */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-2"
          >
            <Label htmlFor="street" className="text-base font-medium text-slate-700">
              Street address
            </Label>
            <Input
              ref={streetRef}
              id="street"
              type="text"
              value={street}
              onChange={(e) => {
                setStreet(e.target.value);
                clearError('street');
              }}
              onKeyDown={(e) => handleKeyDown(e, 'street2')}
              placeholder="123 Main St"
              className={`h-14 text-lg px-4 rounded-xl border-2 transition-all ${
                errors.street
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
              }`}
              autoComplete="address-line1"
            />
            {errors.street && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 flex items-center gap-1"
              >
                <span>⚠️</span> {errors.street}
              </motion.p>
            )}
          </motion.div>

          {/* Street Address Line 2 */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="space-y-2"
          >
            <Label htmlFor="street2" className="text-base font-medium text-slate-700">
              Apt, suite, etc. <span className="text-slate-400 font-normal">(optional)</span>
            </Label>
            <Input
              id="street2"
              type="text"
              value={street2}
              onChange={(e) => setStreet2(e.target.value)}
              onKeyDown={(e) => handleKeyDown(e, 'city')}
              placeholder="Apt 4B"
              className="h-14 text-lg px-4 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-sky-500/20 transition-all"
              autoComplete="address-line2"
            />
          </motion.div>

          {/* City */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="space-y-2"
          >
            <Label htmlFor="city" className="text-base font-medium text-slate-700">
              City
            </Label>
            <Input
              id="city"
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                clearError('city');
              }}
              onKeyDown={(e) => handleKeyDown(e, 'state')}
              placeholder="San Francisco"
              className={`h-14 text-lg px-4 rounded-xl border-2 transition-all ${
                errors.city
                  ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                  : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
              }`}
              autoComplete="address-level2"
            />
            {errors.city && (
              <motion.p
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-sm text-red-500 flex items-center gap-1"
              >
                <span>⚠️</span> {errors.city}
              </motion.p>
            )}
          </motion.div>

          {/* State and ZIP */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="grid grid-cols-2 gap-4"
          >
            {/* State */}
            <div className="space-y-2">
              <Label htmlFor="state" className="text-base font-medium text-slate-700">
                State
              </Label>
              <Select
                value={selectedState}
                onValueChange={(value) => {
                  setSelectedState(value);
                  clearError('state');
                }}
              >
                <SelectTrigger
                  id="state"
                  className={`h-14 text-lg px-4 rounded-xl border-2 transition-all ${
                    errors.state
                      ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                      : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                  }`}
                >
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((stateAbbr) => (
                    <SelectItem key={stateAbbr} value={stateAbbr}>
                      {stateAbbr}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {errors.state && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 flex items-center gap-1"
                >
                  <span>⚠️</span> {errors.state}
                </motion.p>
              )}
            </div>

            {/* ZIP Code */}
            <div className="space-y-2">
              <Label htmlFor="zipCode" className="text-base font-medium text-slate-700">
                ZIP code
              </Label>
              <Input
                id="zipCode"
                type="text"
                inputMode="numeric"
                value={zipCode}
                onChange={(e) => {
                  // Only allow numbers and dashes
                  const value = e.target.value.replace(/[^\d-]/g, '');
                  setZipCode(value);
                  clearError('zipCode');
                }}
                onKeyDown={(e) => handleKeyDown(e)}
                placeholder="94102"
                maxLength={10}
                className={`h-14 text-lg px-4 rounded-xl border-2 transition-all ${
                  errors.zipCode
                    ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                    : 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
                }`}
                autoComplete="postal-code"
              />
              {errors.zipCode && (
                <motion.p
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-sm text-red-500 flex items-center gap-1"
                >
                  <span>⚠️</span> {errors.zipCode}
                </motion.p>
              )}
            </div>
          </motion.div>
        </div>
      </ShakeOnError>

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

