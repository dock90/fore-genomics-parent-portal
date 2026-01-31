'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import {
	CheckCircle,
	ArrowRight,
	Package,
	TestTube,
	FileText,
	Video,
	Calendar,
	Bell,
	Loader2,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import type { StepProps } from '@/lib/onboarding/types';
import { StaggerChildren, StaggerItem, AnimatedCheckmark } from '../StepTransition';

export default function ConfirmationStep({ state }: StepProps) {
	const router = useRouter();
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const firstName = state.firstName || 'there';
	const isUnborn = state.childIsUnborn;

	// Format due date for display
	const formattedDueDate = state.childDueDate
		? new Date(state.childDueDate).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric',
		})
		: null;

	// Next steps for regular (born child) flow
	const regularNextSteps = [
		{
			icon: Package,
			title: 'Kit ships in 2-3 days',
			description: "You'll receive tracking info via email",
		},
		{
			icon: TestTube,
			title: 'Collect sample & return',
			description: 'Easy at-home cheek swab collection',
		},
		{
			icon: FileText,
			title: 'Results in 4-6 weeks',
			description: 'Comprehensive genetic analysis',
		},
		{
			icon: Video,
			title: 'Genetic counseling session',
			description: 'Review results with an expert',
		},
	];

	// Next steps for unborn child flow
	const unbornNextSteps = [
		{
			icon: Calendar,
			title: 'Due date saved',
			description: formattedDueDate || 'Your due date has been recorded',
		},
		{
			icon: Bell,
			title: "We'll reach out after baby arrives",
			description: 'Complete the remaining steps when ready',
		},
		{
			icon: Package,
			title: 'Kit ships when you complete',
			description: 'After providing baby details & consent',
		},
	];

	const nextSteps = isUnborn ? unbornNextSteps : regularNextSteps;

	// Completed items for regular flow
	const regularCompleted = [
		'Your information',
		'Child details',
		'Consent signed',
		'Health history',
	];

	// Completed items for unborn flow
	const unbornCompleted = ['Your information', 'Due date recorded'];

	const completedItems = isUnborn ? unbornCompleted : regularCompleted;

	const handleGoToDashboard = async () => {
		setIsSubmitting(true);
		setError(null);

		try {
			// Save onboarding data to API
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

					// Child info
					childIsUnborn: state.childIsUnborn,
					childFirstName: state.childFirstName,
					childLastName: state.childLastName,
					childDob: state.childDob,
					childDueDate: state.childDueDate,
					childSex: state.childSex,
					childEthnicity: state.childEthnicity,
					childEthnicityOther: state.childEthnicityOther,
					relationshipToChild: state.relationshipToChild,

					// Parent invitation
					invitedParent: state.invitedParent,

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
				throw new Error(data.error || 'Failed to save onboarding data');
			}

			// Navigate to dashboard
			router.push('/dashboard');
		} catch (err) {
			setError(err instanceof Error ? err.message : 'Something went wrong');
			setIsSubmitting(false);
		}
	};

	return (
		<div className="space-y-8">
			{/* Celebration Header */}
			<motion.div
				initial={{ scale: 0.8, opacity: 0 }}
				animate={{ scale: 1, opacity: 1 }}
				transition={{ type: 'spring', stiffness: 200, damping: 15 }}
				className="text-center space-y-4"
			>
				{/* Success Icon */}
				<div className="flex justify-center">
					<div
						className={`w-20 h-20 rounded-full flex items-center justify-center shadow-lg ${isUnborn
								? 'bg-gradient-to-br from-violet-400 to-violet-600 shadow-violet-500/30'
								: 'bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-emerald-500/30'
							}`}
					>
						<AnimatedCheckmark className="w-10 h-10 text-white" />
					</div>
				</div>

				{/* Title */}
				<div>
					<motion.h1
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.3 }}
						className="text-3xl sm:text-4xl font-bold text-slate-900"
					>
						{isUnborn ? `Thanks, ${firstName}!` : `You're all set, ${firstName}!`}
					</motion.h1>
					<motion.p
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.4 }}
						className="text-lg text-slate-600 mt-2"
					>
						{isUnborn
							? "We've saved your information"
							: 'Your onboarding is complete'}
					</motion.p>
				</div>
			</motion.div>

			{/* Checklist of completed items */}
			<motion.div
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.5 }}
				className={`border rounded-2xl p-6 ${isUnborn
						? 'bg-violet-50 border-violet-100'
						: 'bg-emerald-50 border-emerald-100'
					}`}
			>
				<h3
					className={`font-semibold mb-3 ${isUnborn ? 'text-violet-800' : 'text-emerald-800'
						}`}
				>
					Completed
				</h3>
				<div className="space-y-2">
					{completedItems.map((item) => (
						<div
							key={item}
							className={`flex items-center gap-2 ${isUnborn ? 'text-violet-700' : 'text-emerald-700'
								}`}
						>
							<CheckCircle
								className={`w-4 h-4 ${isUnborn ? 'text-violet-500' : 'text-emerald-500'
									}`}
							/>
							<span className="text-sm">{item}</span>
						</div>
					))}
				</div>
			</motion.div>

			{/* What's Next Timeline */}
			<div className="space-y-4">
				<h2 className="text-lg font-semibold text-slate-900">
					{isUnborn ? 'What to expect' : 'What happens next'}
				</h2>

				<StaggerChildren staggerDelay={0.1} className="space-y-3">
					{nextSteps.map((step, index) => (
						<StaggerItem key={step.title}>
							<div className="flex items-center gap-4 p-4 bg-white border border-slate-200 rounded-xl">
								<div
									className={`flex items-center justify-center w-12 h-12 rounded-full flex-shrink-0 ${isUnborn ? 'bg-violet-100' : 'bg-sky-100'
										}`}
								>
									<step.icon
										className={`w-6 h-6 ${isUnborn ? 'text-violet-600' : 'text-sky-600'
											}`}
									/>
								</div>
								<div className="flex-1 min-w-0">
									<div className="flex items-center gap-2">
										<span className="text-xs font-medium text-slate-400">
											{index + 1}
										</span>
										<h4 className="font-medium text-slate-900">{step.title}</h4>
									</div>
									<p className="text-sm text-slate-500">{step.description}</p>
								</div>
							</div>
						</StaggerItem>
					))}
				</StaggerChildren>
			</div>

			{/* Error Message */}
			{error && (
				<motion.div
					initial={{ opacity: 0, y: -10 }}
					animate={{ opacity: 1, y: 0 }}
					className="p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm"
				>
					{error}
				</motion.div>
			)}

			{/* Action Button */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.8 }}
				className="pt-4"
			>
				<Button
					onClick={handleGoToDashboard}
					disabled={isSubmitting}
					className={`w-full py-6 text-lg font-medium shadow-lg ${isUnborn
							? 'bg-gradient-to-r from-violet-500 to-violet-600 hover:from-violet-600 hover:to-violet-700 shadow-violet-500/25'
							: 'bg-gradient-to-r from-sky-500 to-sky-600 hover:from-sky-600 hover:to-sky-700 shadow-sky-500/25'
						}`}
				>
					{isSubmitting ? (
						<>
							<Loader2 className="w-5 h-5 mr-2 animate-spin" />
							Saving...
						</>
					) : (
						<>
							Go to Dashboard
							<ArrowRight className="w-5 h-5 ml-2" />
						</>
					)}
				</Button>
			</motion.div>
		</div>
	);
}
