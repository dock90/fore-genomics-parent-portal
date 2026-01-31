'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { Package, Check } from 'lucide-react';
import type { StepProps, KitData } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';

export default function KitSelectionStep({ onNext, state }: StepProps) {
	const [selectedKitId, setSelectedKitId] = useState<string | null>(
		state.selectedKitId
	);

	const kits = state.kits || [];

	// If no kits or only one kit, this step should be skipped
	// This is handled by the step condition, but we handle it here as a safety
	if (kits.length <= 1) {
		return null;
	}

	const handleSelect = (kit: KitData) => {
		setSelectedKitId(kit.id);

		// Auto-advance after selection
		setTimeout(() => {
			onNext({ selectedKitId: kit.id });
		}, 300);
	};

	return (
		<StepContent
			title="Which kit are you setting up?"
			subtitle="Select the kit you'd like to complete"
		>
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.1 }}
				className="space-y-3"
			>
				{kits.map((kit, index) => {
					const isSelected = selectedKitId === kit.id;
					const isComplete = kit.isComplete;
					const isUnborn = kit.isUnborn;
					const isDone = isComplete || isUnborn;

					return (
						<motion.button
							key={kit.id}
							type="button"
							onClick={() => !isDone && handleSelect(kit)}
							disabled={isDone}
							whileTap={{ scale: isDone ? 1 : 0.98 }}
							initial={{ opacity: 0, y: 20 }}
							animate={{ opacity: 1, y: 0 }}
							transition={{ delay: 0.1 + index * 0.05 }}
							className={`relative w-full flex items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 ${
								isComplete
									? 'border-emerald-200 bg-emerald-50 cursor-not-allowed'
									: isUnborn
										? 'border-violet-200 bg-violet-50 cursor-not-allowed'
										: isSelected
											? 'border-sky-500 bg-sky-50 shadow-md shadow-sky-500/10'
											: 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
							}`}
						>
							{/* Kit Icon */}
							<div
								className={`flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-xl ${
									isComplete
										? 'bg-emerald-100'
										: isUnborn
											? 'bg-violet-100'
											: isSelected
												? 'bg-sky-100'
												: 'bg-slate-100'
								}`}
							>
								{isComplete ? (
									<Check className="w-7 h-7 text-emerald-600" />
								) : isUnborn ? (
									<Check className="w-7 h-7 text-violet-600" />
								) : (
									<Package
										className={`w-7 h-7 ${
											isSelected ? 'text-sky-600' : 'text-slate-400'
										}`}
									/>
								)}
							</div>

							{/* Content */}
							<div className="flex-1 min-w-0">
								<p
									className={`font-semibold text-lg ${
										isComplete
											? 'text-emerald-800'
											: isUnborn
												? 'text-violet-800'
												: isSelected
													? 'text-sky-900'
													: 'text-slate-900'
									}`}
								>
									Kit #{kit.kitNumber}
								</p>
								<p
									className={`text-sm ${
										isComplete
											? 'text-emerald-600'
											: isUnborn
												? 'text-violet-600'
												: isSelected
													? 'text-sky-700'
													: 'text-slate-500'
									}`}
								>
									{isComplete 
										? 'Setup complete' 
										: isUnborn 
											? 'Awaiting birth'
											: kit.kitType || 'Ready to set up'}
								</p>
							</div>

							{/* Selection indicator */}
							{!isDone && (
								<div
									className={`w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all ${
										isSelected
											? 'border-sky-500 bg-sky-500'
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
							)}

							{/* Status badge */}
							{isComplete && (
								<span className="flex-shrink-0 text-sm font-medium text-emerald-600 bg-emerald-100 px-3 py-1 rounded-full">
									Done
								</span>
							)}
							{isUnborn && (
								<span className="flex-shrink-0 text-sm font-medium text-violet-600 bg-violet-100 px-3 py-1 rounded-full">
									Pending
								</span>
							)}
						</motion.button>
					);
				})}
			</motion.div>

			{/* Progress summary */}
			{kits.some((k) => k.isComplete || k.isUnborn) && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.3 }}
					className="p-4 bg-slate-50 rounded-xl"
				>
					<p className="text-sm text-slate-600">
						<span className="font-semibold text-emerald-600">
							{kits.filter((k) => k.isComplete || k.isUnborn).length}
						</span>{' '}
						of{' '}
						<span className="font-semibold text-slate-900">{kits.length}</span>{' '}
						kits set up
					</p>
				</motion.div>
			)}
		</StepContent>
	);
}
