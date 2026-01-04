'use client';

import { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Mail, User, Send } from 'lucide-react';
import type { StepProps } from '@/lib/onboarding/types';
import { StepContent } from '../OnboardingShell';
import { ShakeOnError } from '../StepTransition';
import { showValidationToast, validationMessages } from '@/lib/onboarding/validation-messages';

export default function ParentInvitationStep({ onNext, state }: StepProps) {
	const [name, setName] = useState(state.invitedParent?.name || '');
	const [email, setEmail] = useState(state.invitedParent?.email || '');
	const [errors, setErrors] = useState<{ name?: string; email?: string }>({});
	const [shake, setShake] = useState(false);

	const nameRef = useRef<HTMLInputElement>(null);

	// Auto-focus name on mount
	useEffect(() => {
		const timer = setTimeout(() => {
			nameRef.current?.focus();
		}, 300);
		return () => clearTimeout(timer);
	}, []);

	const validate = (): boolean => {
		const newErrors: typeof errors = {};

		if (!name.trim()) {
			newErrors.name = "Parent/guardian's name is required";
		}

		const emailTrimmed = email.trim();
		if (!emailTrimmed) {
			newErrors.email = 'Email address is required';
		} else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailTrimmed)) {
			newErrors.email = 'Please enter a valid email address';
		}

		setErrors(newErrors);

		if (Object.keys(newErrors).length > 0) {
			// Show friendly toast
			if (newErrors.name && !newErrors.email) {
				showValidationToast(validationMessages.parentInvitation.name);
			} else if (newErrors.email && newErrors.email.includes('valid')) {
				showValidationToast(validationMessages.parentInvitation.invalidEmail);
			} else if (newErrors.email) {
				showValidationToast(validationMessages.parentInvitation.email);
			} else {
				showValidationToast(validationMessages.parentInvitation.name);
			}

			setShake(true);
			setTimeout(() => setShake(false), 500);
			return false;
		}

		return true;
	};

	const handleSubmit = () => {
		if (validate()) {
			onNext({
				invitedParent: {
					name: name.trim(),
					email: email.trim(),
				},
			});
		}
	};

	// Handle enter key navigation
	const handleKeyDown = (
		e: React.KeyboardEvent,
		field: 'name' | 'email'
	) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (field === 'name' && name.trim()) {
				const emailInput = document.getElementById('parentEmail');
				emailInput?.focus();
			} else if (field === 'email') {
				handleSubmit();
			}
		}
	};

	// Listen for navigation next event
	useEffect(() => {
		const handleNavigationNext = () => handleSubmit();
		window.addEventListener('onboarding-next', handleNavigationNext);
		return () =>
			window.removeEventListener('onboarding-next', handleNavigationNext);
	}, [name, email]);

	return (
		<StepContent
			title="Invite a parent or guardian"
			subtitle="They'll need to complete the consent process"
		>
			{/* Info Card */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="p-4 bg-sky-50 border border-sky-100 rounded-xl flex items-start gap-3"
			>
				<Send className="w-5 h-5 text-sky-600 flex-shrink-0 mt-0.5" />
				<div className="text-sm text-sky-800">
					<p className="font-medium">We'll send them an email invitation</p>
					<p className="mt-1 text-sky-700">
						They'll be able to review the child's information and complete
						the consent form on their own device.
					</p>
				</div>
			</motion.div>

			<ShakeOnError shake={shake}>
				<div className="space-y-6">
					{/* Name */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.1 }}
						className="space-y-2"
					>
						<Label
							htmlFor="parentName"
							className="text-base font-medium text-slate-700"
						>
							Full name
						</Label>
						<div className="relative">
							<User className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
							<Input
								ref={nameRef}
								id="parentName"
								type="text"
								value={name}
								onChange={(e) => {
									setName(e.target.value);
									if (errors.name)
										setErrors((prev) => ({ ...prev, name: undefined }));
								}}
								onKeyDown={(e) => handleKeyDown(e, 'name')}
								placeholder="Parent or guardian's name"
								className={`h-14 text-lg pl-12 pr-4 rounded-xl border-2 transition-all ${
									errors.name
										? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
										: 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
								}`}
								autoComplete="name"
								autoCapitalize="words"
							/>
						</div>
						{errors.name && (
							<motion.p
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="text-sm text-red-500 flex items-center gap-1"
							>
								<span>⚠️</span> {errors.name}
							</motion.p>
						)}
					</motion.div>

					{/* Email */}
					<motion.div
						initial={{ opacity: 0, y: 20 }}
						animate={{ opacity: 1, y: 0 }}
						transition={{ delay: 0.2 }}
						className="space-y-2"
					>
						<Label
							htmlFor="parentEmail"
							className="text-base font-medium text-slate-700"
						>
							Email address
						</Label>
						<div className="relative">
							<Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-slate-400" />
							<Input
								id="parentEmail"
								type="email"
								value={email}
								onChange={(e) => {
									setEmail(e.target.value);
									if (errors.email)
										setErrors((prev) => ({ ...prev, email: undefined }));
								}}
								onKeyDown={(e) => handleKeyDown(e, 'email')}
								placeholder="email@example.com"
								className={`h-14 text-lg pl-12 pr-4 rounded-xl border-2 transition-all ${
									errors.email
										? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
										: 'border-slate-200 focus:border-sky-500 focus:ring-sky-500/20'
								}`}
								autoComplete="email"
								inputMode="email"
							/>
						</div>
						{errors.email && (
							<motion.p
								initial={{ opacity: 0, y: -10 }}
								animate={{ opacity: 1, y: 0 }}
								className="text-sm text-red-500 flex items-center gap-1"
							>
								<span>⚠️</span> {errors.email}
							</motion.p>
						)}
					</motion.div>
				</div>
			</ShakeOnError>

			{/* Privacy note */}
			<motion.p
				initial={{ opacity: 0 }}
				animate={{ opacity: 1 }}
				transition={{ delay: 0.4 }}
				className="text-sm text-slate-500 flex items-center gap-2"
			>
				<span>🔒</span>
				Their information will only be used for this invitation.
			</motion.p>

			{/* Hidden submit button */}
			<button
				type="button"
				onClick={handleSubmit}
				className="sr-only"
				aria-label="Send Invitation"
			>
				Send Invitation
			</button>
		</StepContent>
	);
}
