'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { ShakeOnError } from '../StepTransition';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function ChildNameStep({ onNext, state }: StepProps) {
	const [firstName, setFirstName] = useState(state.childFirstName || '');
	const [lastName, setLastName] = useState(state.childLastName || '');
	const [errors, setErrors] = useState<{
		firstName?: string;
		lastName?: string;
	}>({});
	const [shake, setShake] = useState(false);

	const firstNameRef = useRef<HTMLInputElement>(null);

	// Auto-focus first name on mount
	useEffect(() => {
		const timer = setTimeout(() => {
			firstNameRef.current?.focus();
		}, 300);
		return () => clearTimeout(timer);
	}, []);

	const validate = (): boolean => {
		const newErrors: typeof errors = {};
		const missingFirst = !firstName.trim();
		const missingLast = !lastName.trim();

		if (missingFirst) {
			newErrors.firstName = "Child's first name is required";
		}
		if (missingLast) {
			newErrors.lastName = "Child's last name is required";
		}

		setErrors(newErrors);

		if (Object.keys(newErrors).length > 0) {
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}

		return true;
	};

	const handleSubmit = () => {
		if (validate()) {
			onNext({
				childFirstName: firstName.trim(),
				childLastName: lastName.trim(),
			});
		}
	};

	// Handle enter key to submit or move to next field
	const handleKeyDown = (
		e: React.KeyboardEvent,
		field: 'firstName' | 'lastName'
	) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (field === 'firstName' && firstName.trim()) {
				const lastNameInput = document.getElementById('childLastName');
				lastNameInput?.focus();
			} else if (field === 'lastName' && lastName.trim()) {
				handleSubmit();
			}
		}
	};

	// Register submit handler with parent navigation
	useStepSubmit(handleSubmit);

	return (
		<StepContent
			title="What's your child's name?"
			educationalTip={{
				title: 'For the report',
				body: "Your child's name will appear on their genetic testing report.",
				icon: '📄',
			}}
		>
			<ShakeOnError shake={shake}>
				<div className="space-y-6">
					{/* First Name */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="space-y-2"
					>
						<Label
							htmlFor="childFirstName"
							className="text-base font-medium text-slate-700"
						>
							First name
						</Label>
						<Input
							ref={firstNameRef}
							id="childFirstName"
							type="text"
							value={firstName}
							onChange={(e) => {
								setFirstName(e.target.value);
								if (errors.firstName)
									setErrors((prev) => ({ ...prev, firstName: undefined }));
							}}
							onKeyDown={(e) => handleKeyDown(e, 'firstName')}
							placeholder="Enter first name"
							className={`h-14 text-lg px-4 rounded-xl border-2 transition-all ${
								errors.firstName
									? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
									: 'border-slate-200 focus:border-primary focus:ring-primary/20'
							}`}
							autoComplete="off"
							autoCapitalize="words"
						/>
						{errors.firstName && (
							<motion.p
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="text-sm text-red-500 flex items-center gap-1"
							>
								<span>⚠️</span> {errors.firstName}
							</motion.p>
						)}
					</motion.div>

					{/* Last Name */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="space-y-2"
					>
						<Label
							htmlFor="childLastName"
							className="text-base font-medium text-slate-700"
						>
							Last name
						</Label>
						<Input
							id="childLastName"
							type="text"
							value={lastName}
							onChange={(e) => {
								setLastName(e.target.value);
								if (errors.lastName)
									setErrors((prev) => ({ ...prev, lastName: undefined }));
							}}
							onKeyDown={(e) => handleKeyDown(e, 'lastName')}
							placeholder="Enter last name"
							className={`h-14 text-lg px-4 rounded-xl border-2 transition-all ${
								errors.lastName
									? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
									: 'border-slate-200 focus:border-primary focus:ring-primary/20'
							}`}
							autoComplete="off"
							autoCapitalize="words"
						/>
						{errors.lastName && (
							<motion.p
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="text-sm text-red-500 flex items-center gap-1"
							>
								<span>⚠️</span> {errors.lastName}
							</motion.p>
						)}
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
