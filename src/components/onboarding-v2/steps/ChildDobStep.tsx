'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Label } from '@/components/ui/label';
import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { ShakeOnError } from '../StepTransition';
import { ResponsiveDatePicker } from '@/components/ui/date-picker-mobile';
import { showValidationToast, validationMessages } from '@/lib/onboarding/validation-messages';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function ChildDobStep({ onNext, state }: StepProps) {
	// Determine if this is for DOB or due date based on child status
	const isUnborn = state.childIsUnborn;
	const [date, setDate] = useState(
		isUnborn ? state.childDueDate || '' : state.childDob || ''
	);
	const [error, setError] = useState<string | null>(null);
	const [shake, setShake] = useState(false);

	const today = new Date();
	const maxDate = isUnborn ? undefined : today;
	const minDate = isUnborn ? today : undefined;

	const validate = (): boolean => {
		if (!date) {
			setError(isUnborn ? 'Due date is required' : 'Date of birth is required');
			showValidationToast(
				isUnborn
					? validationMessages.childDueDate.required
					: validationMessages.childDob.required
			);
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}

		const selectedDate = new Date(date);

		if (isUnborn && selectedDate < today) {
			setError('Due date must be in the future');
			showValidationToast(validationMessages.childDueDate.past);
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}

		if (!isUnborn && selectedDate > today) {
			setError('Date of birth cannot be in the future');
			showValidationToast(validationMessages.childDob.future);
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}

		return true;
	};

	const handleSubmit = () => {
		if (validate()) {
			if (isUnborn) {
				onNext({ childDueDate: date });
			} else {
				onNext({ childDob: date });
			}
		}
	};

	// Register submit handler with parent navigation
	useStepSubmit(handleSubmit);

	const title = isUnborn
		? "When is your baby's due date?"
		: 'When was your child born?';

	const subtitle = isUnborn
		? "We'll reach out after your baby arrives"
		: undefined;

	return (
		<StepContent title={title} subtitle={subtitle}>
			<ShakeOnError shake={shake}>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="space-y-2"
				>
					<Label className="text-base font-medium text-slate-700">
						{isUnborn ? 'Due date' : 'Date of birth'}
					</Label>
					<ResponsiveDatePicker
						value={date}
						onChange={(value) => {
							setDate(value);
							if (error) setError(null);
						}}
						placeholder={isUnborn ? 'Select due date' : 'Select date of birth'}
						minDate={minDate}
						maxDate={maxDate}
						error={!!error}
					/>
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

			{/* Helper text */}
			{!isUnborn && (
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="text-sm text-slate-500"
				>
					This information helps us provide age-appropriate analysis.
				</motion.p>
			)}

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
