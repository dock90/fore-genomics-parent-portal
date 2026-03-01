'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, X, HelpCircle } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { cn } from "@/lib/utils";

export type YesNoNotSure = boolean | 'not-sure' | null;

interface YesNoDetailProps {
  value: YesNoNotSure;
  onChange: (value: boolean | 'not-sure') => void;
  detailValue?: string;
  onDetailChange?: (detail: string) => void;
  showDetailOn: 'yes' | 'no';
  detailPlaceholder?: string;
  detailLabel?: string;
  yesLabel?: string;
  noLabel?: string;
  notSureLabel?: string;
  showNotSure?: boolean;
  notSureDetailLabel?: string;
  notSureDetailPlaceholder?: string;
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
  notSureLabel = 'Not Sure',
  showNotSure = false,
  notSureDetailLabel = 'Anything you\'d like to share (optional):',
  notSureDetailPlaceholder = 'Describe in your own words...',
  className,
}: YesNoDetailProps) {
  const showYesNoDetail = value === (showDetailOn === 'yes') && value !== 'not-sure';
  const showNotSureDetail = value === 'not-sure';

  return (
    <div className={cn('space-y-4', className)}>
      <div className={cn('grid gap-3', showNotSure ? 'grid-cols-1' : 'grid-cols-2')}>
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
        {showNotSure && (
          <YesNoButton
            selected={value === 'not-sure'}
            onClick={() => onChange('not-sure')}
            variant="not-sure"
            label={notSureLabel}
          />
        )}
      </div>

      <AnimatePresence>
        {showYesNoDetail && onDetailChange && (
          <motion.div
            key="yes-no-detail"
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
        {showNotSureDetail && onDetailChange && (
          <motion.div
            key="not-sure-detail"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="pt-2">
              <label className="text-sm font-medium text-slate-700 block mb-2">
                {notSureDetailLabel}
              </label>
              <Textarea
                value={detailValue}
                onChange={(e) => onDetailChange(e.target.value)}
                placeholder={notSureDetailPlaceholder}
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
  variant: 'yes' | 'no' | 'not-sure';
  label: string;
}

function YesNoButton({ selected, onClick, variant, label }: YesNoButtonProps) {
  const selectedStyles = {
    yes: 'border-emerald-500 bg-emerald-50 text-emerald-700',
    no: 'border-rose-500 bg-rose-50 text-rose-700',
    'not-sure': 'border-amber-500 bg-amber-50 text-amber-700',
  };

  const iconBgStyles = {
    yes: 'bg-emerald-500',
    no: 'bg-rose-500',
    'not-sure': 'bg-amber-500',
  };

  const Icon = variant === 'yes' ? Check : variant === 'no' ? X : HelpCircle;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'relative flex items-center justify-center gap-2 py-4 px-4 rounded-xl border-2 transition-all duration-200',
        'touch-manipulation active:scale-[0.98]',
        selected
          ? selectedStyles[variant]
          : 'border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      )}
    >
      <motion.div
        initial={false}
        animate={{
          scale: selected ? 1 : 0.8,
          opacity: selected ? 1 : 0.5,
        }}
        className={cn(
          'w-6 h-6 rounded-full flex items-center justify-center',
          selected ? iconBgStyles[variant] : 'bg-slate-200'
        )}
      >
        <Icon className={cn('w-4 h-4', selected ? 'text-white' : 'text-slate-400')} />
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
    <div className={cn('grid grid-cols-2 gap-3', className)}>
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

