'use client';

import { Button } from '@/components/ui/button';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { deleteChild, deleteQuestionnaire, deleteUser } from '../actions';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';

interface UserData {
	id: string;
	email: string;
	role: string;
	createdAt: string | Date;
	profile?: {
		id: string;
		firstName: string;
		lastName: string;
		address: string;
		addressLine2?: string | null;
		city: string;
		state: string;
		zipCode: string;
	} | null;
	consents: Array<{
		id: string;
		accepted: boolean;
		signerName?: string | null;
		signatureDate?: string | Date | null;
	}>;
	children: Array<{
		id: string;
		firstName: string | null;
		lastName: string | null;
		dob: string | Date | null;
		dueDate: string | Date | null;
	}>;
	questionnaires: Array<{
		id: string;
		createdAt: string | Date;
	}>;
}

interface UserDataManagementProps {
	users: UserData[];
}

// Function to format date strings as local dates (prevents timezone issues)
function formatLocalDate(
	dateString: string | Date | null,
	formatStr: string
): string {
	if (!dateString) return 'Not provided';

	// If it's already a YYYY-MM-DD string, parse it as local date
	if (
		typeof dateString === 'string' &&
		/^\d{4}-\d{2}-\d{2}$/.test(dateString)
	) {
		const [year, month, day] = dateString.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		return format(date, formatStr);
	}

	// Fallback for other date formats
	return format(new Date(dateString), formatStr);
}

export function UserDataManagement({ users }: UserDataManagementProps) {
	const router = useRouter();

	const handleDeleteChild = async (childId: string) => {
		const formData = new FormData();
		formData.append('childId', childId);
		await deleteChild(formData);
		router.refresh();
	};

	const handleDeleteQuestionnaire = async (questionnaireId: string) => {
		const formData = new FormData();
		formData.append('questionnaireId', questionnaireId);
		await deleteQuestionnaire(formData);
		router.refresh();
	};

	const handleDeleteUser = async (userId: string, userEmail: string) => {
		const formData = new FormData();
		formData.append('userId', userId);
		formData.append('userEmail', userEmail);
		await deleteUser(formData);
		router.refresh();
	};

	return (
		<div className="space-y-3">
			<h2 className="text-sm font-medium text-foreground">
				All Users ({users.length})
			</h2>
			<div className="space-y-3">
				{users.map((user) => (
					<div
						key={user.id}
						className="border border-border rounded-lg p-4 space-y-3"
					>
						<div className="flex items-center justify-between">
							<div>
								<h3 className="font-medium text-foreground">
									{user.profile
										? `${user.profile.firstName} ${user.profile.lastName}`
										: user.email}
								</h3>
								<p className="text-sm text-muted-foreground">
									{user.email} • {user.role} • Joined{' '}
									{new Date(user.createdAt).toLocaleDateString()}
								</p>
							</div>
							<ConfirmDialog
								title="Delete User?"
								description={`Are you sure you want to delete ${user.profile?.firstName} ${user.profile?.lastName} (${user.email})? This will permanently delete the user and all their data including profile, consents, children, questionnaires, and orders. This action cannot be undone.`}
								onConfirm={() => handleDeleteUser(user.id, user.email)}
							>
								<Button size="sm" variant="destructive" className="text-white">
									Delete User
								</Button>
							</ConfirmDialog>
						</div>

						{/* User Profile */}
						{user.profile && (
							<div className="text-sm text-muted-foreground bg-muted/30 px-3 py-2 rounded">
								{user.profile.address}
								{user.profile.addressLine2 && <>, {user.profile.addressLine2}</>}
								, {user.profile.city}, {user.profile.state}{' '}
								{user.profile.zipCode}
							</div>
						)}

						{/* Inline data sections */}
						<div className="flex flex-wrap gap-4 text-sm">
							{/* Consents */}
							{user.consents.length > 0 && (
								<div className="text-muted-foreground">
									<span className="font-medium text-foreground">Consents:</span>{' '}
									{user.consents.length}
								</div>
							)}

							{/* Children */}
							{user.children.length > 0 && (
								<div className="flex items-center gap-2">
									<span className="font-medium text-foreground">Children:</span>
									{user.children.map((child, idx) => (
										<span key={child.id} className="inline-flex items-center gap-1">
											<span className="text-muted-foreground">
												{child.firstName && child.lastName
													? `${child.firstName} ${child.lastName}`
													: 'Unborn'}{' '}
												({child.dob
													? formatLocalDate(child.dob, 'MMM yyyy')
													: child.dueDate
														? `Due ${formatLocalDate(child.dueDate, 'MMM yyyy')}`
														: 'N/A'})
											</span>
											<ConfirmDialog
												title="Delete Child?"
												description={`Are you sure you want to delete ${child.firstName && child.lastName ? `${child.firstName} ${child.lastName}` : 'this child'}? This cannot be undone.`}
												onConfirm={() => handleDeleteChild(child.id)}
											>
												<button className="text-destructive hover:text-destructive/80 text-xs">
													×
												</button>
											</ConfirmDialog>
											{idx < user.children.length - 1 && ','}
										</span>
									))}
								</div>
							)}

							{/* Questionnaires */}
							{user.questionnaires.length > 0 && (
								<div className="flex items-center gap-2">
									<span className="font-medium text-foreground">
										Questionnaires:
									</span>
									{user.questionnaires.map((q, idx) => (
										<span key={q.id} className="inline-flex items-center gap-1">
											<span className="text-muted-foreground">
												{new Date(q.createdAt).toLocaleDateString()}
											</span>
											<ConfirmDialog
												title="Delete Questionnaire?"
												description="Are you sure you want to delete this questionnaire? This cannot be undone."
												onConfirm={() => handleDeleteQuestionnaire(q.id)}
											>
												<button className="text-destructive hover:text-destructive/80 text-xs">
													×
												</button>
											</ConfirmDialog>
											{idx < user.questionnaires.length - 1 && ','}
										</span>
									))}
								</div>
							)}
						</div>
					</div>
				))}
			</div>
		</div>
	);
}
