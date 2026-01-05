'use client';

import { ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface StepTransitionProps {
  children: ReactNode;
  stepKey: string;
  direction: 1 | -1; // 1 = forward, -1 = backward
}

// Slide animation variants
const slideVariants = {
  enter: (direction: number) => ({
    x: direction > 0 ? '30%' : '-30%',
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? '30%' : '-30%',
    opacity: 0,
  }),
};

// Transition configuration
const transition = {
  type: 'spring' as const,
  stiffness: 300,
  damping: 30,
  mass: 0.8,
};

export function StepTransition({ children, stepKey, direction }: StepTransitionProps) {
  return (
    <AnimatePresence mode="wait" custom={direction}>
      <motion.div
        key={stepKey}
        custom={direction}
        variants={slideVariants}
        initial="enter"
        animate="center"
        exit="exit"
        transition={transition}
      >
        {children}
      </motion.div>
    </AnimatePresence>
  );
}

/**
 * Fade transition for less dramatic changes
 */
interface FadeTransitionProps {
  children: ReactNode;
  show: boolean;
}

export function FadeTransition({ children, show }: FadeTransitionProps) {
  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          transition={{ duration: 0.2 }}
        >
          {children}
        </motion.div>
      )}
    </AnimatePresence>
  );
}

/**
 * Scale animation for buttons and interactive elements
 */
interface ScaleOnTapProps {
  children: ReactNode;
  className?: string;
}

export function ScaleOnTap({ children, className }: ScaleOnTapProps) {
  return (
    <motion.div
      className={className}
      whileTap={{ scale: 0.98 }}
      transition={{ duration: 0.1 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Shake animation for validation errors
 */
interface ShakeOnErrorProps {
  children: ReactNode;
  shake: boolean;
  className?: string;
}

export function ShakeOnError({ children, shake, className }: ShakeOnErrorProps) {
  return (
    <motion.div
      className={className}
      animate={shake ? { x: [0, -10, 10, -10, 10, 0] } : {}}
      transition={{ duration: 0.4 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered children animation for lists
 */
interface StaggerChildrenProps {
  children: ReactNode;
  className?: string;
  staggerDelay?: number;
}

export function StaggerChildren({ children, className, staggerDelay = 0.05 }: StaggerChildrenProps) {
  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
          },
        },
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Individual stagger item
 */
interface StaggerItemProps {
  children: ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <motion.div
      className={className}
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: { opacity: 1, y: 0 },
      }}
      transition={{ type: 'spring', stiffness: 300, damping: 24 }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Checkmark draw animation
 */
export function AnimatedCheckmark({ className }: { className?: string }) {
  return (
    <motion.svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={3}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <motion.path
        d="M5 13l4 4L19 7"
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      />
    </motion.svg>
  );
}

/**
 * Progress bar fill animation
 */
interface AnimatedProgressProps {
  percentage: number;
  className?: string;
}

export function AnimatedProgress({ percentage, className }: AnimatedProgressProps) {
  return (
    <div className={`h-2 bg-slate-200 rounded-full overflow-hidden ${className}`}>
      <motion.div
        className="h-full bg-gradient-to-r from-sky-500 to-sky-600 rounded-full"
        initial={{ width: 0 }}
        animate={{ width: `${percentage}%` }}
        transition={{ type: 'spring', stiffness: 100, damping: 20 }}
      />
    </div>
  );
}

