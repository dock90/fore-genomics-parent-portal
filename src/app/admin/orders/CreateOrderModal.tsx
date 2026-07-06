'use client';

import { Button } from '@/components/ui/button';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { PlusIcon, AlertCircle } from 'lucide-react';
import { createOrder } from './create/_actions';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { useEffect } from 'react';
import { cn } from '@/lib/utils';

interface User {
	id: string;
	email: string;
	profile?: {
		firstName: string;
		lastName: string;
	} | null;
}

interface CreateOrderModalProps {
	users: User[];
}

type KitType = 'BASE';

type Relationship = 'MOTHER' | 'FATHER' | 'GUARDIAN' | 'OTHER';

// Per-kit pre-fill data entered by an admin who already has the signed paper
// TRF and child info. Sent to the server so the parent skips onboarding.
interface PrefillChild {
	isUnborn: boolean;
	firstName: string;
	lastName: string;
	dob: string;
	sex: string;
	dueDate: string;
	relationshipToChild: Relationship | '';
	consentPreCollected: boolean;
	consentSignerName: string;
	consentReference: string;
	q1: 'true' | 'false';
	q1Details: string;
	q2: 'true' | 'false';
	q2Details: string;
	q3: 'true' | 'false';
	q3Details: string;
}

const emptyPrefillChild = (): PrefillChild => ({
	isUnborn: false,
	firstName: '',
	lastName: '',
	dob: '',
	sex: '',
	dueDate: '',
	relationshipToChild: '',
	consentPreCollected: false,
	consentSignerName: '',
	consentReference: '',
	q1: 'false',
	q1Details: '',
	q2: 'false',
	q2Details: '',
	q3: 'false',
	q3Details: '',
});

// Labels for the three pre-test questionnaire questions (mirrors onboarding).
const QUESTIONNAIRE_LABELS: { key: 'q1' | 'q2' | 'q3'; label: string }[] = [
	{ key: 'q1', label: 'Were developmental milestones met on time?' },
	{ key: 'q2', label: 'Is there relevant family medical history?' },
	{ key: 'q3', label: 'Any prior hospitalizations or major medical history?' },
];

const createOrderSchema = z.discriminatedUnion('userType', [
	// Schema for existing users
	z.object({
		userType: z.literal('existing'),
		userId: z.string().min(1, 'Please select a user'),
		firstName: z.string().optional(),
		lastName: z.string().optional(),
		email: z.string().optional(),
		notes: z.string().optional(),
		kitCount: z.number().min(1).max(10),
		kitTypes: z.array(z.enum(['BASE'])),
	}),
	// Schema for new users
	z.object({
		userType: z.literal('new'),
		userId: z.string().optional(),
		firstName: z.string().min(1, 'First name is required'),
		lastName: z.string().min(1, 'Last name is required'),
		email: z.string().email('Please enter a valid email address'),
		notes: z.string().optional(),
		kitCount: z.number().min(1).max(10),
		kitTypes: z.array(z.enum(['BASE'])),
	}),
]);
type CreateOrderFormData = z.infer<typeof createOrderSchema>;

export function CreateOrderModal({ users }: CreateOrderModalProps) {
	const router = useRouter();
	const [isOpen, setIsOpen] = useState(false);
	const [isSubmitting, setIsSubmitting] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [hasInteracted, setHasInteracted] = useState(false);
	const [kitCount, setKitCount] = useState(1);
	const [kitTypes, setKitTypes] = useState<KitType[]>(['BASE']);
	const [defaultsSet, setDefaultsSet] = useState(false);
	const [prefill, setPrefill] = useState(false);
	const [holdInvite, setHoldInvite] = useState(false);
	const [prefillChildren, setPrefillChildren] = useState<PrefillChild[]>([
		emptyPrefillChild(),
	]);

	// Pre-filling always implies the invite is held until sent manually.
	const inviteHeld = prefill || holdInvite;

	// Check if there are users available
	const hasUsers = users.length > 0;
	const defaultUserId = ''; // No default user - admin must select

	const form = useForm<CreateOrderFormData>({
		resolver: zodResolver(createOrderSchema),
		defaultValues: {
			userType: hasUsers ? 'existing' : 'new', // Back to existing if users available
			userId: defaultUserId, // Empty - no default selection
			firstName: '',
			lastName: '',
			email: '',
			notes: '',
			kitCount: 1,
			kitTypes: ['BASE'],
		},
		mode: 'onSubmit', // Only validate on submit to avoid premature errors
		shouldUnregister: false, // Keep field values when switching between user types
		reValidateMode: 'onChange', // Re-validate when values change
	});

	// Force form to use our default values
	useEffect(() => {
		if (hasUsers && !defaultsSet) {
			// No default user - just mark defaults as set
			setDefaultsSet(true);
		}
	}, [hasUsers, defaultsSet]);

	// Watch form values and trigger validation when they change
	useEffect(() => {
		const subscription = form.watch((value, { name, type }) => {
			if (type === 'change' && name) {
				// Trigger validation for the changed field
				form.trigger(name as keyof CreateOrderFormData);
			}
		});
		return () => subscription.unsubscribe();
	}, [form]);

	const userType = form.watch('userType');

	// Update kit types when kit count changes
	const handleKitCountChange = (newKitCount: number) => {
		setKitCount(newKitCount);
		form.setValue('kitCount', newKitCount);
		setError(null); // Clear error when kit configuration changes

		if (kitTypes.length < newKitCount) {
			// Add default BASE kits
			const newKitTypes = [
				...kitTypes,
				...Array(newKitCount - kitTypes.length).fill('BASE'),
			];
			setKitTypes(newKitTypes);
			form.setValue('kitTypes', newKitTypes);
		} else if (kitTypes.length > newKitCount) {
			// Remove excess kits
			const newKitTypes = kitTypes.slice(0, newKitCount);
			setKitTypes(newKitTypes);
			form.setValue('kitTypes', newKitTypes);
		}

		// Keep the pre-fill children array in sync with the kit count.
		setPrefillChildren((prev) => {
			if (prev.length < newKitCount) {
				return [
					...prev,
					...Array.from({ length: newKitCount - prev.length }, () =>
						emptyPrefillChild()
					),
				];
			}
			if (prev.length > newKitCount) {
				return prev.slice(0, newKitCount);
			}
			return prev;
		});
	};

	const updatePrefillChild = (index: number, patch: Partial<PrefillChild>) => {
		setPrefillChildren((prev) =>
			prev.map((child, i) => (i === index ? { ...child, ...patch } : child))
		);
		setError(null);
	};

	const handleUserIdChange = (selectedUserId: string) => {
		if (selectedUserId) {
			const selectedUser = users.find((user) => user.id === selectedUserId);
			if (selectedUser) {
				// Clear the userId error immediately to prevent flashing
				form.clearErrors('userId');

				// Set the userId first
				form.setValue('userId', selectedUserId);

				// Then populate the other fields
				form.setValue('firstName', selectedUser.profile?.firstName || '');
				form.setValue('lastName', selectedUser.profile?.lastName || '');
				form.setValue('email', selectedUser.email);

				// Clear any previous errors
				setError(null);
			}
		}
	};

	const onSubmit = async (data: CreateOrderFormData) => {
		setIsSubmitting(true);
		setError(null); // Clear any previous errors

		try {
			const formData = new FormData();
			formData.append('userType', data.userType);

			if (data.userType === 'existing') {
				formData.append('userId', data.userId!);
			} else {
				formData.append('firstName', data.firstName!);
				formData.append('lastName', data.lastName!);
				formData.append('email', data.email!);
			}

			formData.append('notes', data.notes || '');
			formData.append('kitCount', data.kitCount.toString());
			formData.append('kitTypes', JSON.stringify(data.kitTypes));
			formData.append('prefill', prefill ? 'true' : 'false');
			formData.append('holdInvite', inviteHeld ? 'true' : 'false');
			if (prefill) {
				formData.append(
					'children',
					JSON.stringify(prefillChildren.slice(0, data.kitCount))
				);
			}

			const result = await createOrder(formData);

			if (result.success) {
				setIsOpen(false);
				form.reset({
					userType: hasUsers ? 'existing' : 'new',
					userId: defaultUserId,
					firstName: '',
					lastName: '',
					email: '',
					notes: '',
					kitCount: 1,
					kitTypes: ['BASE'],
				});
				setKitCount(1);
				setKitTypes(['BASE']);
				setPrefill(false);
				setPrefillChildren([emptyPrefillChild()]);
				setError(null);
				router.refresh();
			} else {
				// Display error from the action
				setError(result.error);
			}
		} catch (error) {
			// Fallback error handling for unexpected errors
			const errorMessage =
				error instanceof Error ? error.message : 'Failed to create order';
			setError(errorMessage);
		} finally {
			setIsSubmitting(false);
		}
	};

	const handleOpenChange = (open: boolean) => {
		setIsOpen(open);
		if (!open) {
			form.reset({
				userType: hasUsers ? 'existing' : 'new',
				userId: defaultUserId,
				firstName: '',
				lastName: '',
				email: '',
				notes: '',
				kitCount: 1,
				kitTypes: ['BASE'],
			});
			setKitCount(1);
			setKitTypes(['BASE']);
			setPrefill(false);
			setHoldInvite(false);
			setPrefillChildren([emptyPrefillChild()]);
			setError(null);
		} else {
			// Force validation after reset to ensure isValid is correct
			setTimeout(() => {
				form.trigger();
			}, 100);
		}
	};

	// Check if form is valid for button state
	const isFormValid = (() => {
		const userType = form.watch('userType');
		const userId = form.watch('userId');

		if (userType === 'new') {
			// For new users, check if required fields are filled
			const firstName = form.watch('firstName');
			const lastName = form.watch('lastName');
			const email = form.watch('email');
			return firstName && lastName && email;
		} else if (userType === 'existing') {
			// For existing users, just need a userId selected
			return !!userId;
		}
		return false;
	})();

	// Only show validation errors after user has interacted with the form
	const shouldShowErrors = hasInteracted;

	return (
		<Dialog open={isOpen} onOpenChange={handleOpenChange}>
			<DialogTrigger asChild>
				<Button className="flex items-center gap-2">
					<PlusIcon className="h-4 w-4" />
					Create Order
				</Button>
			</DialogTrigger>
			<DialogContent className="sm:max-w-[600px] max-h-[85vh] overflow-y-auto">
				<DialogHeader>
					<DialogTitle>Create New Order</DialogTitle>
					<DialogDescription>
						Create a new order for an existing user or create a new user
						account.
					</DialogDescription>
				</DialogHeader>

				{/* Error Alert */}
				{error && (
					<Alert variant="destructive">
						<AlertCircle className="h-4 w-4" />
						<AlertDescription>{error}</AlertDescription>
					</Alert>
				)}

				<form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
					<div className="space-y-4">
						{/* User Type Selection */}
						<div>
							<Label>User Type</Label>
							<RadioGroup
								value={userType}
								onValueChange={(value) => {
									// If trying to select "existing" but no users available, force "new"
									const actualValue =
										value === 'existing' && !hasUsers ? 'new' : value;

									if (actualValue === 'existing') {
										// Switching to existing user - clear fields and require user selection
										form.setValue(
											'userType',
											actualValue as 'existing' | 'new'
										);
										form.setValue('userId', '');
										form.setValue('firstName', '');
										form.setValue('lastName', '');
										form.setValue('email', '');
									} else {
										// Switching to new user - clear fields
										form.setValue(
											'userType',
											actualValue as 'existing' | 'new'
										);
										form.setValue('userId', '');
										form.setValue('firstName', '');
										form.setValue('lastName', '');
										form.setValue('email', '');
									}

									// Clear all form errors when switching user types to prevent stale errors
									form.clearErrors();
									setError(null); // Clear error when user type changes
								}}
								className="flex flex-col space-y-2"
							>
								<div className="flex items-center space-x-2">
									<RadioGroupItem
										value="existing"
										id="existing"
										disabled={!hasUsers}
									/>
									<Label
										htmlFor="existing"
										className={!hasUsers ? 'text-muted-foreground' : ''}
									>
										Existing User {!hasUsers && '(No users available)'}
									</Label>
								</div>
								<div className="flex items-center space-x-2">
									<RadioGroupItem value="new" id="new" />
									<Label htmlFor="new">New User</Label>
								</div>
							</RadioGroup>
						</div>

						{/* Existing User Selection */}
						{userType === 'existing' && (
							<div>
								<Label htmlFor="userId">Select User *</Label>
								{!hasUsers ? (
									<div className="text-sm text-muted-foreground mt-1">
										No users available. Please create a new user instead.
									</div>
								) : (
									<Select
										value={form.watch('userId')}
										onValueChange={(value) => {
											setHasInteracted(true);
											handleUserIdChange(value);
										}}
									>
										<SelectTrigger
											className={cn(
												'w-full',
												shouldShowErrors &&
													form.formState.errors.userId &&
													'border-red-500'
											)}
										>
											<SelectValue placeholder="Choose a user..." />
										</SelectTrigger>
										<SelectContent>
											{users.map((user) => (
												<SelectItem key={user.id} value={user.id}>
													{user.profile?.firstName} {user.profile?.lastName} (
													{user.email})
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								)}
								{shouldShowErrors && form.formState.errors.userId && (
									<p className="text-sm text-red-500 mt-1">
										{form.formState.errors.userId.message}
									</p>
								)}
							</div>
						)}

						{/* New User Fields */}
						{userType === 'new' && (
							<div className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<div>
										<Label htmlFor="firstName">First Name *</Label>
										<Input
											id="firstName"
											{...form.register('firstName')}
											placeholder="Enter first name"
											className={cn(
												'w-full',
												shouldShowErrors &&
													form.formState.errors.firstName &&
													'border-red-500'
											)}
											onChange={(e) => {
												setHasInteracted(true);
												form.register('firstName').onChange(e);
												setError(null); // Clear error when user types
											}}
										/>
										{shouldShowErrors && form.formState.errors.firstName && (
											<p className="text-sm text-red-500 mt-1">
												{form.formState.errors.firstName.message}
											</p>
										)}
									</div>
									<div>
										<Label htmlFor="lastName">Last Name *</Label>
										<Input
											id="lastName"
											{...form.register('lastName')}
											placeholder="Enter last name"
											className={cn(
												'w-full',
												shouldShowErrors &&
													form.formState.errors.lastName &&
													'border-red-500'
											)}
											onChange={(e) => {
												setHasInteracted(true);
												form.register('lastName').onChange(e);
												setError(null); // Clear error when user types
											}}
										/>
										{shouldShowErrors && form.formState.errors.lastName && (
											<p className="text-sm text-red-500 mt-1">
												{form.formState.errors.lastName.message}
											</p>
										)}
									</div>
								</div>
								<div>
									<Label htmlFor="email">Email Address *</Label>
									<Input
										id="email"
										type="email"
										{...form.register('email')}
										placeholder="Enter email address"
										className={cn(
											'w-full',
											shouldShowErrors &&
												form.formState.errors.email &&
												'border-red-500'
										)}
										onChange={(e) => {
											setHasInteracted(true);
											form.register('email').onChange(e);
											setError(null); // Clear error when user types
										}}
									/>
									{shouldShowErrors && form.formState.errors.email && (
										<p className="text-sm text-red-500 mt-1">
											{form.formState.errors.email.message}
										</p>
									)}
								</div>
							</div>
						)}

						{/* Kit Configuration */}
						<div className="space-y-4">
							<div>
								<Label htmlFor="kitCount">Number of Test Kits *</Label>
								<Select
									value={kitCount.toString()}
									onValueChange={(value) => {
										setHasInteracted(true);
										handleKitCountChange(parseInt(value));
									}}
								>
									<SelectTrigger
										className={cn(
											'w-full',
											shouldShowErrors &&
												form.formState.errors.kitCount &&
												'border-red-500'
										)}
									>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((num) => (
											<SelectItem key={num} value={num.toString()}>
												{num} {num === 1 ? 'Kit' : 'Kits'}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{shouldShowErrors && form.formState.errors.kitCount && (
									<p className="text-sm text-red-500 mt-1">
										{form.formState.errors.kitCount.message}
									</p>
								)}
							</div>

							{/* Kit type — all kits are Base. The Plus/Premium tiers
							    were removed (HH-122) to avoid confusion. */}
							<div className="space-y-3">
								<Label>Kit Type</Label>
								{Array.from({ length: kitCount }, (_, index) => (
									<div key={index} className="flex items-center gap-3">
										<span className="text-sm font-medium w-8">
											#{index + 1}
										</span>
										<div className="flex-1 rounded-md border border-input bg-muted/40 px-3 py-2 text-sm text-muted-foreground">
											Base Kit
										</div>
									</div>
								))}
							</div>
						</div>

						{/* Invite timing — let the admin hold the portal invite and
						    send it manually later from the order page. */}
						{userType === 'new' && (
							<div className="flex items-start gap-3 rounded-md border p-4">
								<Checkbox
									id="holdInvite"
									checked={inviteHeld}
									disabled={prefill}
									onCheckedChange={(checked) => {
										setHoldInvite(checked === true);
										setError(null);
									}}
									className="mt-1"
								/>
								<div>
									<Label htmlFor="holdInvite" className="font-medium">
										Hold portal invite — I&apos;ll send it manually
									</Label>
									<p className="text-sm text-muted-foreground">
										The account is created but no Clerk invite goes out. Send it
										from the order page once everything is added.
										{prefill && ' (Always on while pre-filling.)'}
									</p>
								</div>
							</div>
						)}

						{/* Pre-fill child info & consent (skip parent onboarding) */}
						<div className="space-y-3 rounded-md border p-4">
							<div className="flex items-start gap-3">
								<Checkbox
									id="prefill"
									checked={prefill}
									onCheckedChange={(checked) => {
										setPrefill(checked === true);
										setError(null);
									}}
									className="mt-1"
								/>
								<div>
									<Label htmlFor="prefill" className="font-medium">
										Pre-fill child info & consent (skip parent onboarding)
									</Label>
									<p className="text-sm text-muted-foreground">
										Use this when you already have the signed paper TRF and
										child details. The parent will skip onboarding and land
										straight on their results. The portal invite is held until
										you send it manually from the order page.
									</p>
								</div>
							</div>

							{prefill &&
								Array.from({ length: kitCount }, (_, index) => {
									const child = prefillChildren[index] || emptyPrefillChild();
									return (
										<div
											key={index}
											className="space-y-3 rounded-md border bg-muted/30 p-3"
										>
											<div className="flex items-center justify-between">
												<span className="text-sm font-semibold">
													Child #{index + 1} (Kit #{index + 1})
												</span>
												<div className="flex items-center gap-2">
													<Checkbox
														id={`unborn-${index}`}
														checked={child.isUnborn}
														onCheckedChange={(checked) =>
															updatePrefillChild(index, {
																isUnborn: checked === true,
															})
														}
													/>
													<Label
														htmlFor={`unborn-${index}`}
														className="text-sm font-normal"
													>
														Not yet born (results pending)
													</Label>
												</div>
											</div>

											{child.isUnborn ? (
												<div>
													<Label htmlFor={`dueDate-${index}`}>Due Date</Label>
													<Input
														id={`dueDate-${index}`}
														type="date"
														value={child.dueDate}
														onChange={(e) =>
															updatePrefillChild(index, {
																dueDate: e.target.value,
															})
														}
													/>
												</div>
											) : (
												<>
													<div className="grid grid-cols-2 gap-3">
														<div>
															<Label htmlFor={`childFirst-${index}`}>
																Child First Name
															</Label>
															<Input
																id={`childFirst-${index}`}
																value={child.firstName}
																placeholder="First name"
																onChange={(e) =>
																	updatePrefillChild(index, {
																		firstName: e.target.value,
																	})
																}
															/>
														</div>
														<div>
															<Label htmlFor={`childLast-${index}`}>
																Child Last Name
															</Label>
															<Input
																id={`childLast-${index}`}
																value={child.lastName}
																placeholder="Last name"
																onChange={(e) =>
																	updatePrefillChild(index, {
																		lastName: e.target.value,
																	})
																}
															/>
														</div>
													</div>
													<div className="grid grid-cols-2 gap-3">
														<div>
															<Label htmlFor={`dob-${index}`}>
																Date of Birth
															</Label>
															<Input
																id={`dob-${index}`}
																type="date"
																value={child.dob}
																onChange={(e) =>
																	updatePrefillChild(index, {
																		dob: e.target.value,
																	})
																}
															/>
														</div>
														<div>
															<Label htmlFor={`sex-${index}`}>Sex</Label>
															<Select
																value={child.sex}
																onValueChange={(value) =>
																	updatePrefillChild(index, { sex: value })
																}
															>
																<SelectTrigger id={`sex-${index}`}>
																	<SelectValue placeholder="Select..." />
																</SelectTrigger>
																<SelectContent>
																	<SelectItem value="Male">Male</SelectItem>
																	<SelectItem value="Female">Female</SelectItem>
																</SelectContent>
															</Select>
														</div>
													</div>

													{/* Pre-test questionnaire */}
													<div className="space-y-2">
														<Label className="text-sm">
															Pre-test questionnaire
														</Label>
														{QUESTIONNAIRE_LABELS.map(({ key, label }) => (
															<div
																key={key}
																className="flex items-center justify-between gap-3"
															>
																<span className="text-sm text-muted-foreground">
																	{label}
																</span>
																<Select
																	value={child[key]}
																	onValueChange={(value) =>
																		updatePrefillChild(index, {
																			[key]: value as 'true' | 'false',
																		})
																	}
																>
																	<SelectTrigger className="w-28">
																		<SelectValue />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="true">Yes</SelectItem>
																		<SelectItem value="false">No</SelectItem>
																	</SelectContent>
																</Select>
															</div>
														))}
													</div>

													{/* Consent (pre-collected from signed paper TRF) */}
													<div className="space-y-2 rounded-md border border-dashed p-3">
														<Label className="text-sm font-medium">
															Consent (from signed TRF)
														</Label>
														<div className="grid grid-cols-2 gap-3">
															<div>
																<Label htmlFor={`signer-${index}`}>
																	Signer Name
																</Label>
																<Input
																	id={`signer-${index}`}
																	value={child.consentSignerName}
																	placeholder="Name on the signed TRF"
																	onChange={(e) =>
																		updatePrefillChild(index, {
																			consentSignerName: e.target.value,
																		})
																	}
																/>
															</div>
															<div>
																<Label htmlFor={`rel-${index}`}>
																	Relationship
																</Label>
																<Select
																	value={child.relationshipToChild}
																	onValueChange={(value) =>
																		updatePrefillChild(index, {
																			relationshipToChild:
																				value as Relationship,
																		})
																	}
																>
																	<SelectTrigger id={`rel-${index}`}>
																		<SelectValue placeholder="Select..." />
																	</SelectTrigger>
																	<SelectContent>
																		<SelectItem value="MOTHER">
																			Mother
																		</SelectItem>
																		<SelectItem value="FATHER">
																			Father
																		</SelectItem>
																		<SelectItem value="GUARDIAN">
																			Guardian
																		</SelectItem>
																		<SelectItem value="OTHER">Other</SelectItem>
																	</SelectContent>
																</Select>
															</div>
														</div>
														<div>
															<Label htmlFor={`ref-${index}`}>
																TRF / consent reference (optional)
															</Label>
															<Input
																id={`ref-${index}`}
																value={child.consentReference}
																placeholder="e.g. signed TRF filename or ID"
																onChange={(e) =>
																	updatePrefillChild(index, {
																		consentReference: e.target.value,
																	})
																}
															/>
														</div>
														<div className="flex items-start gap-2">
															<Checkbox
																id={`consent-${index}`}
																checked={child.consentPreCollected}
																onCheckedChange={(checked) =>
																	updatePrefillChild(index, {
																		consentPreCollected: checked === true,
																	})
																}
																className="mt-1"
															/>
															<Label
																htmlFor={`consent-${index}`}
																className="text-sm font-normal"
															>
																I confirm consent was collected on the signed
																paper TRF for this child.
															</Label>
														</div>
													</div>
												</>
											)}
										</div>
									);
								})}
						</div>

						<div>
							<Label htmlFor="notes">Notes (Optional)</Label>
							<Textarea
								id="notes"
								{...form.register('notes')}
								placeholder="Add any notes about this order..."
								className="min-h-[100px]"
								onChange={(e) => {
									setHasInteracted(true);
									form.register('notes').onChange(e);
									setError(null); // Clear error when user types
								}}
							/>
						</div>
					</div>

					<div className="flex gap-4">
						<Button
							type="submit"
							disabled={isSubmitting || !isFormValid}
							className="w-full"
						>
							{isSubmitting
								? 'Creating Order...'
								: inviteHeld
									? 'Create Account (invite held)'
									: 'Create Order'}
						</Button>
						<Button
							type="button"
							variant="outline"
							onClick={() => setIsOpen(false)}
						>
							Cancel
						</Button>
					</div>
				</form>
			</DialogContent>
		</Dialog>
	);
}
