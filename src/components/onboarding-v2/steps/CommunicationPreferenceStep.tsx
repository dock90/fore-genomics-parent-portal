'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Mail, MessageSquare, MessagesSquare } from 'lucide-react';
import type { StepProps, CommunicationPreference } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function CommunicationPreferenceStep({ onNext, state }: StepProps) {
	const [preference, setPreference] = useState<CommunicationPreference>(
		state.communicationPreference || 'EMAIL'
	);

	const handleSelect = (value: CommunicationPreference) => {
		setPreference(value);

		// Auto-advance after selection with slight delay for animation
		setTimeout(() => {
			onNext({ communicationPreference: value });
		}, 300);
	};

	// Handle Continue button click
	const handleSubmit = () => {
		onNext({ communicationPreference: preference });
	};

	// Register submit handler
	useStepSubmit(handleSubmit);

	const options = [
		{
			value: 'EMAIL' as const,
			label: 'Email',
			description: 'Receive updates via email',
			icon: Mail,
		},
		{
			value: 'SMS' as const,
			label: 'Text Message',
			description: 'Receive updates via SMS',
			icon: MessageSquare,
		},
		{
			value: 'BOTH' as const,
			label: 'Both',
			description: 'Receive updates via email and SMS',
			icon: MessagesSquare,
		},
	];

	return (
		<StepContent
			title="How would you like to hear from us?"
			subtitle="Choose your preferred communication method"
			educationalTip={{
				title: 'Your choice',
				body: "We'll use your preference for shipping updates, appointment reminders, and important notifications about your order.",
				icon: '💬',
			}}
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="flex flex-col gap-3"
			>
				{options.map((option) => {
					const isSelected = preference === option.value;
					const Icon = option.icon;

					return (
						<motion.button
							key={option.value}
							type="button"
							onClick={() => handleSelect(option.value)}
							whileTap={{ scale: 0.98 }}
							className={`flex items-center gap-4 rounded-xl border-2 p-4 transition-all duration-200 ${
								isSelected
									? 'border-primary bg-secondary shadow-md shadow-primary/10'
									: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
							}`}
						>
							{/* Icon */}
							<div
								className={`flex h-12 w-12 items-center justify-center rounded-full transition-colors ${
									isSelected ? 'bg-secondary' : 'bg-slate-100'
								}`}
							>
								<Icon
									className={`h-6 w-6 ${
										isSelected ? 'text-primary' : 'text-slate-500'
									}`}
								/>
							</div>

							{/* Text */}
							<div className="flex-1 text-left">
								<span
									className={`block font-semibold ${
										isSelected ? 'text-secondary-foreground' : 'text-slate-700'
									}`}
								>
									{option.label}
								</span>
								<span
									className={`text-sm ${
										isSelected ? 'text-secondary-foreground' : 'text-slate-500'
									}`}
								>
									{option.description}
								</span>
							</div>

							{/* Selection indicator */}
							<div
								className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 ${
									isSelected
										? 'border-primary bg-primary'
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

			{/* Privacy note */}
			<motion.p
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.3 }}
				className="text-sm text-slate-500 flex items-center gap-2"
			>
				<span>🔒</span>
				You can change this preference anytime in your account settings.
			</motion.p>
		</StepContent>
	);
}
