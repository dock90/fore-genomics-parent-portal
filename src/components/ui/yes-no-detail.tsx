'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { clsx } from "clsx";

interface YesNoDetailProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  detailValue?: string;
  onDetailChange?: (detail: string) => void;
  showDetailOn: 'yes' | 'no';
  detailPlaceholder?: string;
  detailLabel?: string;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
}

export function YesNoDetail({
  value,
  onChange,
  detailValue = '',
  onDetailChange,
  showDetailOn,
  detailPlaceholder = 'Please provide details...',
  detailLabel = 'Please tell us more:',
  yesLabel = 'Yes',
  noLabel = 'No',
  className,
}: YesNoDetailProps) {
  const showDetail = value === (showDetailOn === 'yes');

  return (
    <div className={clsx('space-y-4', className)}>
      {/* Yes/No Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <YesNoButton
          selected={value === true}
          onClick={() => onChange(true)}
          variant="yes"
          label={yesLabel}
        />
        <YesNoButton
          selected={value === false}
          onClick={() => onChange(false)}
          variant="no"
          label={noLabel}
        />
      </div>

      {/* Conditional Detail Field */}
      <AnimatePresence>
        {showDetail && onDetailChange && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <label className="text-sm font-medium text-slate-700 block mb-2">
                {detailLabel}
              </label>
              <Textarea
                value={detailValue}
                onChange={(e) => onDetailChange(e.target.value)}
                placeholder={detailPlaceholder}
                className="min-h-[100px] resize-none"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

interface YesNoButtonProps {
  selected: boolean;
  onClick: () => void;
  variant: 'yes' | 'no';
  label: string;
}

function YesNoButton({ selected, onClick, variant, label }: YesNoButtonProps) {
  const isYes = variant === 'yes';

  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        'relative flex items-center justify-center gap-2 py-4 px-6 rounded-xl border-2 transition-all duration-200',
        'touch-manipulation active:scale-[0.98]',
        selected
          ? isYes
            ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
            : 'border-rose-500 bg-rose-50 text-rose-700'
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <motion.div
        initial={false}
        animate={{
          scale: selected ? 1 : 0.8,
          opacity: selected ? 1 : 0.5,
        }}
        className={clsx(
          'w-6 h-6 rounded-full flex items-center justify-center',
          selected
            ? isYes
              ? 'bg-emerald-500'
              : 'bg-rose-500'
            : 'bg-slate-200'
        )}
      >
        {isYes ? (
          <Check className={clsx('w-4 h-4', selected ? 'text-white' : 'text-slate-400')} />
        ) : (
          <X className={clsx('w-4 h-4', selected ? 'text-white' : 'text-slate-400')} />
        )}
      </motion.div>
      <span className="font-medium text-lg">{label}</span>
    </button>
  );
}

// Simplified single Yes/No selection for simpler questions
interface YesNoSimpleProps {
  value: boolean | null;
  onChange: (value: boolean) => void;
  yesLabel?: string;
  noLabel?: string;
  className?: string;
}

export function YesNoSimple({
  value,
  onChange,
  yesLabel = 'Yes',
  noLabel = 'No',
  className,
}: YesNoSimpleProps) {
  return (
    <div className={clsx('grid grid-cols-2 gap-3', className)}>
      <YesNoButton
        selected={value === true}
        onClick={() => onChange(true)}
        variant="yes"
        label={yesLabel}
      />
      <YesNoButton
        selected={value === false}
        onClick={() => onChange(false)}
        variant="no"
        label={noLabel}
      />
    </div>
  );
}

