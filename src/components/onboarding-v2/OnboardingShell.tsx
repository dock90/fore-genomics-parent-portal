'use client';

import { ReactNode } from 'react';
import { ProgressIndicator } from './ProgressIndicator';
import { NavigationControls } from './NavigationControls';
import type { SectionId } from '@/lib/onboarding/types';

interface OnboardingShellProps {
  children: ReactNode;
  progress: {
    percentage: number;
    currentSection: SectionId;
    sectionIndex: number;
    totalSections: number;
    stepsInSection: number;
    currentStepInSection: number;
    currentStepIndex: number;
    totalSteps: number;
  };
  navigation: {
    canGoBack: boolean;
    canGoForward: boolean;
    canSkip: boolean;
    isFirstStep: boolean;
    isLastStep: boolean;
  };
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  isSubmitting?: boolean;
  nextLabel?: string;
  hideNavigation?: boolean;
}

export function OnboardingShell({
  children,
  progress,
  navigation,
  onBack,
  onNext,
  onSkip,
  isSubmitting = false,
  nextLabel,
  hideNavigation = false,
}: OnboardingShellProps) {
  return (
    <div className="min-h-[100dvh] flex flex-col bg-gradient-to-br from-slate-50 via-white to-sky-50">
      {/* Fixed Header with Progress */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-lg border-b border-slate-200/50 safe-area-top">
        <div className="max-w-2xl mx-auto px-4 py-4">
          <ProgressIndicator
            currentSection={progress.currentSection}
            sectionIndex={progress.sectionIndex}
            stepsInSection={progress.stepsInSection}
            currentStepInSection={progress.currentStepInSection}
          />
        </div>
      </header>

      {/* Scrollable Content Area */}
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-4 py-6 sm:py-8 min-h-full">
          <div className="pb-32">
            {/* Extra padding for fixed footer */}
            {children}
          </div>
        </div>
      </main>

      {/* Fixed Footer with Navigation */}
      {!hideNavigation && (
        <footer className="sticky bottom-0 z-50 bg-white/90 backdrop-blur-lg border-t border-slate-200/50 safe-area-bottom">
          <div className="max-w-2xl mx-auto px-4 py-4">
            <NavigationControls
              canGoBack={navigation.canGoBack}
              canSkip={navigation.canSkip}
              isFirstStep={navigation.isFirstStep}
              isLastStep={navigation.isLastStep}
              onBack={onBack}
              onNext={onNext}
              onSkip={onSkip}
              isSubmitting={isSubmitting}
              nextLabel={nextLabel}
            />
          </div>
        </footer>
      )}
    </div>
  );
}

/**
 * Step content wrapper with consistent styling
 */
interface StepContentProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  educationalTip?: {
    title: string;
    body: string;
    icon?: string;
  };
}

export function StepContent({ title, subtitle, children, educationalTip }: StepContentProps) {
  return (
    <div className="space-y-6">
      {/* Step Header */}
      <div className="text-center sm:text-left space-y-2">
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
          {title}
        </h1>
        {subtitle && (
          <p className="text-base sm:text-lg text-slate-600">
            {subtitle}
          </p>
        )}
      </div>

      {/* Educational Tip */}
      {educationalTip && (
        <div className="bg-sky-50 border border-sky-100 rounded-xl p-4 flex items-start gap-3">
          {educationalTip.icon && (
            <span className="text-xl flex-shrink-0">{educationalTip.icon}</span>
          )}
          <div>
            <p className="font-medium text-sky-900 text-sm">{educationalTip.title}</p>
            <p className="text-sky-700 text-sm mt-0.5">{educationalTip.body}</p>
          </div>
        </div>
      )}

      {/* Main Content */}
      <div className="space-y-6">
        {children}
      </div>
    </div>
  );
}

