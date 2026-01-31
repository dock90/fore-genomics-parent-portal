'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function ChildSexStep({ onNext, state }: StepProps) {
	const [sex, setSex] = useState<'Male' | 'Female' | null>(state.childSex);

	const handleSelect = (value: 'Male' | 'Female') => {
		setSex(value);

		// Auto-advance after selection with slight delay for animation
		setTimeout(() => {
			onNext({ childSex: value });
		}, 300);
	};

	// Handle Continue button click
	const handleSubmit = () => {
		if (sex === null) {
			return;
		}
		onNext({ childSex: sex });
	};

	// Register submit handler
	useStepSubmit(handleSubmit);

	const options = [
		{
			value: 'Male' as const,
			label: 'Male',
			icon: '👦',
			color: 'sky',
		},
		{
			value: 'Female' as const,
			label: 'Female',
			icon: '👧',
			color: 'pink',
		},
	];

	return (
		<StepContent
			title="What is your child's biological sex?"
			educationalTip={{
				title: 'Why this matters',
				body: 'Biological sex affects how we analyze certain genetic variants, particularly those on sex chromosomes.',
				icon: '🧬',
			}}
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="flex gap-4"
			>
				{options.map((option) => {
					const isSelected = sex === option.value;

					return (
						<motion.button
							key={option.value}
							type="button"
							onClick={() => handleSelect(option.value)}
							whileTap={{ scale: 0.95 }}
							className={`flex flex-1 flex-col items-center gap-4 rounded-2xl border-2 p-6 sm:p-8 transition-all duration-200 ${
								isSelected
									? option.value === 'Male'
										? 'border-sky-500 bg-sky-50 shadow-lg shadow-sky-500/15'
										: 'border-pink-500 bg-pink-50 shadow-lg shadow-pink-500/15'
									: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
							}`}
						>
							<div
								className={`flex h-20 w-20 items-center justify-center rounded-full text-5xl transition-colors ${
									isSelected
										? option.value === 'Male'
											? 'bg-sky-100'
											: 'bg-pink-100'
										: 'bg-slate-100'
								}`}
							>
								{option.icon}
							</div>
							<span
								className={`font-semibold text-xl ${
									isSelected
										? option.value === 'Male'
											? 'text-sky-900'
											: 'text-pink-900'
										: 'text-slate-700'
								}`}
							>
								{option.label}
							</span>

							{/* Selection indicator */}
							<div
								className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
									isSelected
										? option.value === 'Male'
											? 'border-sky-500 bg-sky-500'
											: 'border-pink-500 bg-pink-500'
										: 'border-slate-300'
								}`}
							>
								{isSelected && (
									<motion.svg
										initial={{ scale: 0 }}
										animate={{ scale: 1 }}
										className="w-3.5 h-3.5 text-white"
										viewBox="0 0 24 24"
										fill="none"
										stroke="currentColor"
										strokeWidth={3}
									>
										<path d="M5 13l4 4L19 7" />
									</motion.svg>
								)}
							</div>
						</motion.button>
					);
				})}
			</motion.div>
		</StepContent>
	);
}
