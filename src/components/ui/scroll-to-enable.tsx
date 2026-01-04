'use client';

import * as React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ScrollToEnableProps {
  children: React.ReactNode;
  onScrollComplete: (completed: boolean) => void;
  isCompleted?: boolean;
  className?: string;
  height?: string;
  completedMessage?: string;
  scrollMessage?: string;
}

export function ScrollToEnable({
  children,
  onScrollComplete,
  isCompleted = false,
  className,
  height = 'max-h-[50vh]',
  completedMessage = 'You\'ve reviewed this section',
  scrollMessage = 'Scroll to read entire section',
}: ScrollToEnableProps) {
  const scrollContainerRef = React.useRef<HTMLDivElement>(null);
  const [hasScrolledToBottom, setHasScrolledToBottom] = React.useState(isCompleted);
  const [showScrollHint, setShowScrollHint] = React.useState(true);
  const [scrollProgress, setScrollProgress] = React.useState(0);

  const handleScroll = React.useCallback(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const { scrollTop, scrollHeight, clientHeight } = container;
    const scrollableHeight = scrollHeight - clientHeight;

    // Calculate progress (0-100)
    const progress = scrollableHeight > 0
      ? Math.min(100, (scrollTop / scrollableHeight) * 100)
      : 100;
    setScrollProgress(progress);

    // Check if scrolled to bottom (with 20px tolerance)
    const isAtBottom = scrollTop + clientHeight >= scrollHeight - 20;

    if (isAtBottom && !hasScrolledToBottom) {
      setHasScrolledToBottom(true);
      onScrollComplete(true);
    }

    // Hide scroll hint after user starts scrolling
    if (scrollTop > 50) {
      setShowScrollHint(false);
    }
  }, [hasScrolledToBottom, onScrollComplete]);

  // Check if content is scrollable on mount and resize
  React.useEffect(() => {
    const container = scrollContainerRef.current;
    if (!container) return;

    const checkScrollable = () => {
      const isScrollable = container.scrollHeight > container.clientHeight;
      if (!isScrollable) {
        // Content fits without scrolling - auto-complete
        setHasScrolledToBottom(true);
        onScrollComplete(true);
        setShowScrollHint(false);
      }
    };

    checkScrollable();
    window.addEventListener('resize', checkScrollable);
    return () => window.removeEventListener('resize', checkScrollable);
  }, [onScrollComplete]);

  // Sync with external isCompleted prop
  React.useEffect(() => {
    if (isCompleted) {
      setHasScrolledToBottom(true);
    }
  }, [isCompleted]);

  return (
    <div className={cn('relative', className)}>
      {/* Progress bar at top */}
      <div className="absolute top-0 left-0 right-0 h-1 bg-slate-200 z-10 rounded-t-lg overflow-hidden">
        <motion.div
          className="h-full bg-sky-500"
          initial={{ width: 0 }}
          animate={{ width: `${scrollProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Scrollable content area */}
      <div
        ref={scrollContainerRef}
        onScroll={handleScroll}
        className={cn(
          'overflow-y-auto overscroll-contain scroll-smooth pt-2',
          'scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent',
          height
        )}
      >
        <div className="px-4 py-3 text-sm text-slate-600 leading-relaxed">
          {children}
        </div>
      </div>

      {/* Scroll hint overlay at bottom */}
      <AnimatePresence>
        {showScrollHint && !hasScrolledToBottom && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 10 }}
            className="absolute bottom-0 left-0 right-0 pointer-events-none"
          >
            {/* Gradient fade */}
            <div className="h-16 bg-gradient-to-t from-white via-white/80 to-transparent" />

            {/* Scroll hint */}
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
              <span className="text-xs text-slate-500 font-medium bg-white/90 px-3 py-1 rounded-full shadow-sm">
                {scrollMessage}
              </span>
              <motion.div
                animate={{ y: [0, 4, 0] }}
                transition={{ duration: 1.5, repeat: Infinity }}
              >
                <ChevronDown className="w-5 h-5 text-slate-400" />
              </motion.div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Completion indicator */}
      <AnimatePresence>
        {hasScrolledToBottom && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="mt-3 flex items-center gap-2 text-emerald-600 text-sm font-medium"
          >
            <div className="w-5 h-5 rounded-full bg-emerald-100 flex items-center justify-center">
              <Check className="w-3.5 h-3.5" />
            </div>
            {completedMessage}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Consent card wrapper for better visual grouping
interface ConsentCardProps {
  title: string;
  children: React.ReactNode;
  className?: string;
}

export function ConsentCard({ title, children, className }: ConsentCardProps) {
  return (
    <div className={cn('bg-slate-50 rounded-xl border border-slate-200', className)}>
      <div className="px-4 py-3 border-b border-slate-200">
        <h3 className="font-semibold text-slate-900">{title}</h3>
      </div>
      {children}
    </div>
  );
}

