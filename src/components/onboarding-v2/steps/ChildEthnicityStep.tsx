'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { StepProps } from '@/lib/onboarding/types';
import { ETHNICITY_OPTIONS } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { MultiChoiceCards } from '@/components/ui/choice-cards';
import { ShakeOnError, FadeTransition } from '../StepTransition';
import { useStepSubmit } from '@/lib/onboarding/step-context';

export default function ChildEthnicityStep({ onNext, state }: StepProps) {
	const [ethnicities, setEthnicities] = useState<string[]>(
		state.childEthnicity || []
	);
	const [ethnicityOther, setEthnicityOther] = useState(
		state.childEthnicityOther || ''
	);
	const [error, setError] = useState<string | null>(null);
	const [shake, setShake] = useState(false);

	const hasOther = ethnicities.includes('Other');

	const validate = (): boolean => {
		if (ethnicities.length === 0) {
			setError('Please select at least one ethnicity');
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}

		if (hasOther && !ethnicityOther.trim()) {
			setError('Please specify the ethnicity');
			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}

		return true;
	};

	const handleSubmit = () => {
		if (validate()) {
			onNext({
				childEthnicity: ethnicities,
				childEthnicityOther: ethnicityOther.trim(),
			});
		}
	};

	// Register submit handler with parent navigation
	useStepSubmit(handleSubmit);

	const options = ETHNICITY_OPTIONS.map((opt) => ({
		value: opt.value,
		label: opt.label,
	}));

	return (
		<StepContent
			title="What is your child's ethnicity?"
			subtitle="Select all that apply"
			educationalTip={{
				title: 'Better analysis',
				body: 'Ethnicity helps our genetic counselors provide more accurate risk assessments for certain conditions that vary by population.',
				icon: '🌍',
			}}
		>
			<ShakeOnError shake={shake}>
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="space-y-4"
				>
					<MultiChoiceCards
						options={options}
						values={ethnicities}
						onChange={(values) => {
							setEthnicities(values);
							if (error) setError(null);
						}}
						columns={2}
						size="sm"
					/>

					{/* Other input field */}
					<FadeTransition show={hasOther}>
						<div className="space-y-2 pt-2">
							<Label
								htmlFor="ethnicityOther"
								className="text-base font-medium text-slate-700"
							>
								Please specify
							</Label>
							<Input
								id="ethnicityOther"
								type="text"
								value={ethnicityOther}
								onChange={(e) => {
									setEthnicityOther(e.target.value);
									if (error) setError(null);
								}}
								placeholder="Enter ethnicity"
								className="h-14 text-lg px-4 rounded-xl border-2 border-slate-200 focus:border-sky-500 focus:ring-sky-500/20 transition-all"
								autoFocus
							/>
						</div>
					</FadeTransition>

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

			{/* Selection count */}
			{ethnicities.length > 0 && (
				<motion.p
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					className="text-sm text-slate-500"
				>
					{ethnicities.length} selected
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
