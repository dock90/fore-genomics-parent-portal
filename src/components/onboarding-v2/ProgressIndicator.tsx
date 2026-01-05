'use client';

import { motion } from 'framer-motion';
import { Check } from 'lucide-react';
import type { SectionId } from '@/lib/onboarding/types';
import { SECTIONS } from '@/lib/onboarding/types';

interface ProgressIndicatorProps {
  currentSection: SectionId;
  sectionIndex: number;
  totalSections: number;
  percentage: number;
  stepsInSection: number;
  currentStepInSection: number;
}

export function ProgressIndicator({
  currentSection,
  sectionIndex,
  totalSections,
  percentage,
  stepsInSection,
  currentStepInSection,
}: ProgressIndicatorProps) {
  // Filter out 'complete' section for progress display
  const displaySections = SECTIONS.filter(s => s.id !== 'complete');
  const adjustedTotalSections = displaySections.length;

  return (
    <div className="space-y-3">
      {/* Section Label */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-lg">
            {SECTIONS.find(s => s.id === currentSection)?.icon}
          </span>
          <span className="font-medium text-slate-900">
            {SECTIONS.find(s => s.id === currentSection)?.label}
          </span>
        </div>
        <span className="text-sm text-slate-500">
          {currentStepInSection} of {stepsInSection}
        </span>
      </div>

      {/* Segmented Progress Bar */}
      <div className="flex gap-1.5">
        {displaySections.map((section, index) => {
          const isComplete = index < sectionIndex;
          const isCurrent = section.id === currentSection;
          const sectionProgress = isCurrent
            ? (currentStepInSection / stepsInSection) * 100
            : isComplete
              ? 100
              : 0;

          return (
            <div
              key={section.id}
              className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden"
            >
              <motion.div
                className={`h-full rounded-full ${
                  isComplete
                    ? 'bg-emerald-500'
                    : isCurrent
                      ? 'bg-gradient-to-r from-sky-500 to-sky-600'
                      : 'bg-slate-200'
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${sectionProgress}%` }}
                transition={{
                  type: 'spring',
                  stiffness: 100,
                  damping: 20,
                }}
              />
            </div>
          );
        })}
      </div>

      {/* Section Pills (Mobile: Hidden, Desktop: Visible) */}
      <div className="hidden sm:flex items-center justify-between pt-1">
        {displaySections.map((section, index) => {
          const isComplete = index < sectionIndex;
          const isCurrent = section.id === currentSection;

          return (
            <div
              key={section.id}
              className={`flex items-center gap-1.5 text-xs font-medium transition-colors ${
                isComplete
                  ? 'text-emerald-600'
                  : isCurrent
                    ? 'text-sky-600'
                    : 'text-slate-400'
              }`}
            >
              {isComplete ? (
                <div className="w-4 h-4 rounded-full bg-emerald-500 flex items-center justify-center">
                  <Check className="w-3 h-3 text-white" />
                </div>
              ) : (
                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center text-[10px] ${
                    isCurrent
                      ? 'border-sky-500 text-sky-600'
                      : 'border-slate-300 text-slate-400'
                  }`}
                >
                  {index + 1}
                </div>
              )}
              <span className="hidden lg:inline">{section.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

/**
 * Minimal progress indicator for consent steps
 */
interface ConsentProgressProps {
  current: number;
  total: number;
}

export function ConsentProgress({ current, total }: ConsentProgressProps) {
  return (
    <div className="flex items-center gap-2">
      {Array.from({ length: total }).map((_, index) => (
        <div
          key={index}
          className={`h-1.5 flex-1 rounded-full transition-colors ${
            index < current
              ? 'bg-emerald-500'
              : index === current
                ? 'bg-sky-500'
                : 'bg-slate-200'
          }`}
        />
      ))}
    </div>
  );
}

