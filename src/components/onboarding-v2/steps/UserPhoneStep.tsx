'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Phone } from 'lucide-react';
import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { ShakeOnError } from '../StepTransition';
import { showValidationToast, validationMessages } from '@/lib/onboarding/validation-messages';

// Format phone number as user types
function formatPhoneNumber(value: string): string {
	const numbers = value.replace(/\D/g, '');

	if (numbers.length === 0) return '';
	if (numbers.length <= 3) return `(${numbers}`;
	if (numbers.length <= 6)
		return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
	return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
}

// Strip formatting to get raw number
function stripPhoneNumber(value: string): string {
	return value.replace(/\D/g, '');
}

export default function UserPhoneStep({ onNext, state }: StepProps) {
	const [phone, setPhone] = useState(() => {
		const existing = state.phone || '';
		return existing ? formatPhoneNumber(existing) : '';
	});
	const [error, setError] = useState<string | null>(null);
	const [shake, setShake] = useState(false);

	const inputRef = useRef<HTMLInputElement>(null);

	// Auto-focus on mount
	useEffect(() => {
		const timer = setTimeout(() => {
			inputRef.current?.focus();
		}, 300);
		return () => clearTimeout(timer);
	}, []);

	const validate = (): boolean => {
		const numbers = stripPhoneNumber(phone);

		if (!numbers) {
			setError('Phone number is required');
			showValidationToast(validationMessages.userPhone.required);
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}

		if (numbers.length !== 10) {
			setError('Please enter a valid 10-digit phone number');
			showValidationToast(validationMessages.userPhone.invalid);
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}

		return true;
	};

	const handleSubmit = () => {
		if (validate()) {
			onNext({ phone: stripPhoneNumber(phone) });
		}
	};

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const formatted = formatPhoneNumber(e.target.value);
		setPhone(formatted);
		if (error) setError(null);
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSubmit();
		}
	};

	// Listen for navigation next event
	useEffect(() => {
		const handleNavigationNext = () => handleSubmit();
		window.addEventListener('onboarding-next', handleNavigationNext);
		return () =>
			window.removeEventListener('onboarding-next', handleNavigationNext);
	}, [phone]);

	return (
		<StepContent
			title="What's your phone number?"
			educationalTip={{
				title: 'For updates',
				body: "We may contact you about important updates regarding your child's test results.",
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
					<Label
						htmlFor="phone"
						className="text-base font-medium text-slate-700"
					>
						Phone number
					</Label>
					<div className="relative">
						<Phone className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
						<Input
							ref={inputRef}
							id="phone"
							type="tel"
							value={phone}
							onChange={handleChange}
							onKeyDown={handleKeyDown}
							placeholder="(555) 123-4567"
							className={`h-14 text-lg pl-12 pr-4 rounded-xl border-2 transition-all ${
								error
									? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
									: 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
							}`}
							autoComplete="tel"
							inputMode="tel"
							maxLength={14} // (XXX) XXX-XXXX
						/>
					</div>
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
				Your number is kept private and secure.
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
