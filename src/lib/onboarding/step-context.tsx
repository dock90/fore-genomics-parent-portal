'use client';

import { createContext, useContext, useRef, useCallback, ReactNode } from 'react';

type SubmitHandler = () => void;

interface StepContextValue {
	/**
	 * Register a submit handler for the current step.
	 * Called by step components to register their validation/submit logic.
	 */
	registerSubmit: (handler: SubmitHandler) => void;

	/**
	 * Trigger the registered submit handler.
	 * Called by the navigation when "Continue" is clicked.
	 */
	triggerSubmit: () => void;
}

const StepContext = createContext<StepContextValue | null>(null);

interface StepProviderProps {
	children: ReactNode;
}

export function StepProvider({ children }: StepProviderProps) {
	const submitHandlerRef = useRef<SubmitHandler | null>(null);

	const registerSubmit = useCallback((handler: SubmitHandler) => {
		submitHandlerRef.current = handler;
	}, []);

	const triggerSubmit = useCallback(() => {
		if (submitHandlerRef.current) {
			submitHandlerRef.current();
		}
	}, []);

	return (
		<StepContext.Provider value={{ registerSubmit, triggerSubmit }}>
			{children}
		</StepContext.Provider>
	);
}

/**
 * Hook for step components to register their submit handler
 */
export function useStepSubmit(submitHandler: SubmitHandler) {
	const context = useContext(StepContext);

	if (!context) {
		throw new Error('useStepSubmit must be used within a StepProvider');
	}

	// Register the handler on mount and when it changes
	// Using useEffect would cause a delay, so we register immediately
	context.registerSubmit(submitHandler);
}

/**
 * Hook for the navigation to trigger submit
 */
export function useStepContext() {
	const context = useContext(StepContext);

	if (!context) {
		throw new Error('useStepContext must be used within a StepProvider');
	}

	return context;
}

