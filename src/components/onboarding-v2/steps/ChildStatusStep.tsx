'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Baby, Calendar } from 'lucide-react';
import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { ChoiceCards } from '@/components/ui/choice-cards';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function ChildStatusStep({ onNext, state }: StepProps) {
	const [childIsUnborn, setChildIsUnborn] = useState<boolean | null>(
		state.childIsUnborn !== undefined ? state.childIsUnborn : null
	);

	const handleSelect = (value: 'born' | 'unborn') => {
		const isUnborn = value === 'unborn';
		setChildIsUnborn(isUnborn);

		// Auto-advance after selection with slight delay for animation
		setTimeout(() => {
			onNext({ childIsUnborn: isUnborn });
		}, 300);
	};

	// Handle Continue button click
	const handleSubmit = () => {
		if (childIsUnborn === null) {
			return;
		}
		onNext({ childIsUnborn });
	};

	// Register submit handler
	useStepSubmit(handleSubmit);

	const options = [
		{
			value: 'born' as const,
			label: 'Already born',
			description: "We'll collect information about your child",
			icon: <Baby className="w-6 h-6 text-sky-600" />,
		},
		{
			value: 'unborn' as const,
			label: 'Not yet born',
			description: "We'll reach out when it's time to continue",
			icon: <Calendar className="w-6 h-6 text-violet-600" />,
		},
	];

	return (
		<StepContent
			title="Is your child already born?"
			subtitle="This helps us customize the next steps"
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
			>
				<ChoiceCards
					options={options}
					value={
						childIsUnborn === null
							? null
							: childIsUnborn
								? 'unborn'
								: 'born'
					}
					onChange={handleSelect}
					size="lg"
				/>
			</motion.div>

			{/* Additional context for unborn selection */}
			{childIsUnborn === true && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					className="mt-4 p-4 bg-violet-50 border border-violet-100 rounded-xl"
				>
					<p className="text-sm text-violet-700">
						<strong>What happens next:</strong> We'll save your progress and
						ask for your due date. After your baby is born, you can complete
						the remaining steps.
					</p>
				</motion.div>
			)}
		</StepContent>
	);
}
