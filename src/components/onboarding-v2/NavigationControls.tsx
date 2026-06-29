'use client';

import { Button } from '@/components/ui/button';
import { ArrowLeft, ArrowRight, Loader2, SkipForward } from 'lucide-react';
import { motion } from 'framer-motion';

interface NavigationControlsProps {
  canGoBack: boolean;
  canSkip?: boolean;
  isFirstStep: boolean;
  isLastStep: boolean;
  onBack: () => void;
  onNext: () => void;
  onSkip?: () => void;
  isSubmitting?: boolean;
  nextLabel?: string;
  backLabel?: string;
  skipLabel?: string;
  nextDisabled?: boolean;
}

export function NavigationControls({
  canGoBack,
  canSkip = false,
  isFirstStep,
  isLastStep,
  onBack,
  onNext,
  onSkip,
  isSubmitting = false,
  nextLabel,
  backLabel = 'Back',
  skipLabel = 'Skip',
  nextDisabled = false,
}: NavigationControlsProps) {
  // Determine the next button label
  const getNextLabel = () => {
    if (nextLabel) return nextLabel;
    if (isLastStep) return 'Complete';
    if (isFirstStep) return 'Get Started';
    return 'Continue';
  };

  return (
    <div className="flex items-center gap-3">
      {/* Back Button */}
      {canGoBack && !isFirstStep && (
        <motion.div
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2 }}
        >
          <Button
            type="button"
            variant="ghost"
            onClick={onBack}
            disabled={isSubmitting}
            className="text-slate-600 hover:text-slate-900 hover:bg-slate-100"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            {backLabel}
          </Button>
        </motion.div>
      )}

      {/* Spacer */}
      <div className="flex-1" />

      {/* Skip Button */}
      {canSkip && onSkip && (
        <Button
          type="button"
          variant="ghost"
          onClick={onSkip}
          disabled={isSubmitting}
          className="text-slate-500 hover:text-slate-700"
        >
          {skipLabel}
          <SkipForward className="w-4 h-4 ml-1" />
        </Button>
      )}

      {/* Next/Continue Button */}
      <motion.div
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
      >
        <Button
          type="button"
          onClick={onNext}
          disabled={isSubmitting || nextDisabled}
          className="min-w-[140px] bg-gradient-to-r from-primary to-fore-blue hover:from-fore-blue hover:to-fore-blue text-white shadow-lg shadow-primary/25 transition-all duration-200"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Please wait...
            </>
          ) : (
            <>
              {getNextLabel()}
              {!isLastStep && <ArrowRight className="w-4 h-4 ml-2" />}
            </>
          )}
        </Button>
      </motion.div>
    </div>
  );
}

/**
 * Simplified navigation for single-action steps (like consent signature)
 */
interface SingleActionProps {
  onAction: () => void;
  label: string;
  isSubmitting?: boolean;
  disabled?: boolean;
  variant?: 'primary' | 'success';
}

export function SingleAction({
  onAction,
  label,
  isSubmitting = false,
  disabled = false,
  variant = 'primary',
}: SingleActionProps) {
  const variantClasses = {
    primary: 'bg-gradient-to-r from-primary to-fore-blue hover:from-fore-blue hover:to-fore-blue shadow-primary/25',
    success: 'bg-gradient-to-r from-emerald-500 to-emerald-600 hover:from-emerald-600 hover:to-emerald-700 shadow-emerald-500/25',
  };

  return (
    <motion.div
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
      className="w-full"
    >
      <Button
        type="button"
        onClick={onAction}
        disabled={isSubmitting || disabled}
        className={`w-full text-white shadow-lg transition-all duration-200 py-6 text-lg font-medium ${variantClasses[variant]}`}
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Please wait...
          </>
        ) : (
          label
        )}
      </Button>
    </motion.div>
  );
}

