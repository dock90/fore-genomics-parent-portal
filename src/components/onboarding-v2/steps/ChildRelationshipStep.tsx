'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { ChoiceCards, type ChoiceOption } from '@/components/ui/choice-cards';
import { useStepSubmit } from '@/lib/onboarding/step-context';
import { showValidationToast, validationMessages } from '@/lib/onboarding/validation-messages';

type RelationshipType = 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';

export default function ChildRelationshipStep({ onNext, state }: StepProps) {
	const [relationship, setRelationship] = useState<RelationshipType | null>(
		state.relationshipToChild
	);

	const handleSelect = (value: RelationshipType) => {
		setRelationship(value);

		// Auto-advance after selection with slight delay for animation
		setTimeout(() => {
			onNext({ relationshipToChild: value });
		}, 300);
	};

	// Handle Continue button click
	const handleSubmit = () => {
		if (relationship === null) {
			showValidationToast(validationMessages.childRelationship.required);
			return;
		}
		onNext({ relationshipToChild: relationship });
	};

	// Register submit handler
	useStepSubmit(handleSubmit);

	const options: ChoiceOption<RelationshipType>[] = [
		{
			value: 'MOTHER',
			label: 'Mother',
			description: 'Biological or adoptive mother',
			icon: <span className="text-2xl">👩</span>,
		},
		{
			value: 'FATHER',
			label: 'Father',
			description: 'Biological or adoptive father',
			icon: <span className="text-2xl">👨</span>,
		},
		{
			value: 'GUARDIAN',
			label: 'Legal Guardian',
			description: 'Court-appointed guardian',
			icon: <span className="text-2xl">👤</span>,
		},
		{
			value: 'OTHER',
			label: 'Other',
			description: "I'm not the parent or guardian",
			icon: <span className="text-2xl">👥</span>,
		},
	];

	return (
		<StepContent
			title="What is your relationship to this child?"
			educationalTip={{
				title: 'Legal requirement',
				body: 'Only a biological parent or legal guardian can provide consent for genetic testing of a minor.',
				icon: '⚖️',
			}}
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
			>
				<ChoiceCards
					options={options}
					value={relationship}
					onChange={handleSelect}
					size="md"
				/>
			</motion.div>

			{/* Warning for OTHER selection */}
			{relationship === 'OTHER' && (
				<motion.div
					initial={{ opacity: 0, height: 0 }}
					animate={{ opacity: 1, height: 'auto' }}
					className="mt-4 p-4 bg-amber-50 border border-amber-200 rounded-xl"
				>
					<p className="text-sm text-amber-800">
						<strong>Note:</strong> Since you're not the parent or legal
						guardian, you'll need to provide their contact information so we
						can send them an invitation to complete the consent process.
					</p>
				</motion.div>
			)}
		</StepContent>
	);
}
