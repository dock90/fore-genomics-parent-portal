'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Loader2, Package, ArrowRight, Calendar } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { StepProps } from '@/lib/onboarding/types';
import { AnimatedCheckmark } from '../StepTransition';

export default function KitCompleteStep({ state, onNext }: StepProps) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [saved, setSaved] = useState(false);

	const currentKit = state.kits.find((k) => k.id === state.selectedKitId);
	const currentKitNumber = currentKit?.kitNumber || 1;
	const isUnborn = state.childIsUnborn;

	// Find kits that still need setup (excluding current one, and excluding unborn kits)
	const incompleteKits = state.kits.filter(
		(k) => !k.isComplete && !k.isUnborn && k.id !== state.selectedKitId
	);
	const hasMoreKits = incompleteKits.length > 0;
	const totalKits = state.kits.length;
	// Count kits that are done (complete or unborn) plus current
	const completedKitsCount = state.kits.filter((k) => k.isComplete || k.isUnborn).length + 1;

	// Save kit data on mount - only run once
	const hasSavedRef = useRef(false);
	useEffect(() => {
		if (!hasSavedRef.current) {
			hasSavedRef.current = true;
			saveKitData();
		}
	}, []);

	const saveKitData = async () => {
		setIsSubmitting(true);
		setError(null);

		try {
			const response = await fetch('/api/onboarding/save', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
				},
				body: JSON.stringify({
					// User info
					firstName: state.firstName,
					lastName: state.lastName,
					address: state.address,
					phone: state.phone,
					communicationPreference: state.communicationPreference,

					// Child info
					childIsUnborn: state.childIsUnborn,
					childFirstName: state.childFirstName,
					childLastName: state.childLastName,
					childDob: state.childDob,
					childDueDate: state.childDueDate,
					childSex: state.childSex,
					childEthnicity: state.childEthnicity,
					relationshipToChild: state.relationshipToChild,

					// Consent
					consent: state.consent,

					// Questionnaire
					questionnaire: state.questionnaire,

					// Context
					orderId: state.orderId,
					selectedKitId: state.selectedKitId,
				}),
			});

			if (!response.ok) {
				const data = await response.json();
				throw new Error(data.error || 'Failed to save kit data');
			}

			setSaved(true);
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong');
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleContinue = () => {
		// Mark current kit as complete (or unborn if applicable)
		const updatedKits = state.kits.map((k) =>
			k.id === state.selectedKitId 
				? { ...k, isComplete: !isUnborn, isUnborn: isUnborn } 
				: k
		);

		if (hasMoreKits) {
			// Update localStorage to preserve user info but clear kit-specific data
			// and set step index to kit-selection (index 5, after about-you section)
			if (typeof window !== 'undefined') {
				const preservedState = {
					// Keep user info
					email: state.email,
					firstName: state.firstName,
					lastName: state.lastName,
					address: state.address,
					phone: state.phone,
					communicationPreference: state.communicationPreference,
					userId: state.userId,
					orderId: state.orderId,
					
					// Update kits with completion status
					kits: updatedKits,
					hasMultipleKits: true,
					selectedKitId: null,
					
					// Clear child-specific data for next kit
					childFirstName: '',
					childLastName: '',
					childDob: '',
					childDueDate: '',
					childSex: null,
					childEthnicity: [],
					childEthnicityOther: '',
					childIsUnborn: false,
					relationshipToChild: null,
					invitedParent: null,
					
					// Clear consent for next kit
					consent: {
						part1Accepted: false,
						part1Scrolled: false,
						part2Accepted: false,
						part2Scrolled: false,
						part3Accepted: false,
						part3Scrolled: false,
						consentAll: false,
						signature: null,
						signatureDate: new Date().toISOString().split('T')[0],
						signerName: `${state.firstName} ${state.lastName}`,
						childName: '',
						childDOB: '',
					},
					
					// Clear questionnaire for next kit
					questionnaire: {
						milestonesOnTime: null,
						milestonesDetails: '',
						familyHistoryExists: null,
						familyHistoryDetails: '',
						hospitalizationHistory: null,
						hospitalizationDetails: '',
					},
					
					// Mark about-you steps as completed and jump to kit-selection
					completedSteps: [
						'welcome',
						'user-name', 
						'user-address',
						'user-phone',
						'communication-preference',
					],
					currentStepIndex: 5, // kit-selection step
					direction: 1,
					
					// Flow flags
					isInvitationFlow: false,
					isUnbornChildFlow: false,
				};
				
				localStorage.setItem('fore_onboarding_draft', JSON.stringify(preservedState));
			}

			// Reload the page - it will restore from localStorage at kit-selection
			window.location.href = '/onboarding';
		} else {
			// All kits complete - proceed to final confirmation
			onNext({ kits: updatedKits });
		}
	};

	const handleGoToDashboard = () => {
		router.push('/dashboard');
	};

	return (
		<div className="space-y-8">
			{/* Success Header */}
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ type: 'spring', stiffness: 200, damping: 15 }}
				className="text-center space-y-4"
			>
				<div className="flex justify-center">
					<div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${
						isUnborn 
							? 'bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-500/30'
							: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'
					}`}>
						{isSubmitting ? (
							<Loader2 className="w-10 h-10 text-white animate-spin" />
						) : isUnborn ? (
							<Calendar className="w-10 h-10 text-white" />
						) : (
							<AnimatedCheckmark className="w-10 h-10 text-white" />
						)}
					</div>
				</div>

				<div>
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="text-3xl sm:text-4xl font-bold text-slate-900"
					>
						{isUnborn ? `Kit #${currentKitNumber} Saved!` : `Kit #${currentKitNumber} Complete!`}
					</motion.h1>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className="text-lg text-slate-600 mt-2"
					>
						{isSubmitting
							? 'Saving your information...'
							: isUnborn
								? "We've saved your due date. We'll reach out after baby arrives."
								: hasMoreKits
									? `${completedKitsCount} of ${totalKits} kits set up`
									: 'All kits are now set up!'}
					</motion.p>
				</div>
			</motion.div>
			
			{/* Unborn child info card */}
			{isUnborn && saved && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.5 }}
					className="bg-violet-50 border border-violet-100 rounded-2xl p-6"
				>
					<h3 className="font-semibold text-violet-900 mb-2">What happens next?</h3>
					<ul className="space-y-2 text-sm text-violet-700">
						<li className="flex items-start gap-2">
							<span className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 flex-shrink-0" />
							<span>We&apos;ll send a reminder when your due date approaches</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 flex-shrink-0" />
							<span>Complete the remaining steps (consent & health history) after baby is born</span>
						</li>
						<li className="flex items-start gap-2">
							<span className="w-1.5 h-1.5 bg-violet-400 rounded-full mt-1.5 flex-shrink-0" />
							<span>Your kit will ship once onboarding is complete</span>
						</li>
					</ul>
				</motion.div>
			)}

			{/* Progress indicator for multi-kit */}
			{totalKits > 1 && (
				<motion.div
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					transition={{ delay: 0.5 }}
					className="bg-slate-50 rounded-2xl p-6"
				>
					<div className="flex items-center justify-between mb-3">
						<span className="text-sm font-medium text-slate-600">
							Kit Setup Progress
						</span>
						<span className="text-sm font-semibold text-emerald-600">
							{completedKitsCount}/{totalKits}
						</span>
					</div>
					<div className="flex gap-2">
						{state.kits.map((kit) => {
							const isCurrent = kit.id === state.selectedKitId;
							const isDone = kit.isComplete || kit.isUnborn || isCurrent;
							const showAsUnborn = kit.isUnborn || (isCurrent && isUnborn);
							
							return (
								<div
									key={kit.id}
									className={`flex-1 h-2 rounded-full ${
										isDone
											? showAsUnborn
												? 'bg-violet-500'
												: 'bg-emerald-500'
											: 'bg-slate-200'
									}`}
								/>
							);
						})}
					</div>
				</motion.div>
			)}

			{/* What's next */}
			{hasMoreKits && saved && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.6 }}
					className="bg-sky-50 border border-sky-100 rounded-2xl p-6"
				>
					<div className="flex items-center gap-3">
						<Package className="w-8 h-8 text-sky-600" />
						<div>
							<h3 className="font-semibold text-sky-900">
								{incompleteKits.length} more kit
								{incompleteKits.length > 1 ? 's' : ''} to set up
							</h3>
							<p className="text-sm text-sky-700">
								Continue to complete the remaining kits
							</p>
						</div>
					</div>
				</motion.div>
			)}

			{/* Error Message */}
			{error && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
				>
					{error}
					<Button
						variant="link"
						className="ml-2 text-red-700 underline p-0 h-auto"
						onClick={saveKitData}
					>
						Try again
					</Button>
				</motion.div>
			)}

			{/* Action Buttons */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.7 }}
				className="space-y-3 pt-4"
			>
				{saved && (
					<Button
						onClick={handleContinue}
						className="w-full py-6 text-lg font-medium bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-lg shadow-sky-500/25"
					>
						{hasMoreKits ? (
							<>
								Continue to Next Kit
								<ArrowRight className="w-5 h-5 ml-2" />
							</>
						) : (
							<>
								Finish Setup
								<CheckCircle className="w-5 h-5 ml-2" />
							</>
						)}
					</Button>
				)}

				{saved && !hasMoreKits && (
					<Button
						variant="outline"
						onClick={handleGoToDashboard}
						className="w-full py-5"
					>
						Go to Dashboard
					</Button>
				)}
			</motion.div>
		</div>
	);
}
