'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { deleteChild, deleteQuestionnaire, deleteUser } from '@/app/actions';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import Link from 'next/link';
import {
	ArrowLeftIcon,
	MailIcon,
	MapPinIcon,
	CalendarIcon,
	UserIcon,
	FileTextIcon,
	ClipboardIcon,
	PackageIcon,
} from 'lucide-react';

interface UserDetailProps {
	user: {
		id: string;
		email: string;
		role: string;
		createdAt: Date;
		profile?: {
			id: string;
			firstName: string;
			lastName: string;
			address: string;
			addressLine2?: string | null;
			city: string;
			state: string;
			zipCode: string;
			phone: string;
		} | null;
		consents: Array<{
			id: string;
			accepted: boolean;
			signerName?: string | null;
			signatureDate?: Date | null;
			relationshipToChild?: string | null;
			kit?: {
				id: string;
				kitNumber: number;
				child?: {
					firstName: string | null;
					lastName: string | null;
				} | null;
				order?: {
					orderNumber: string;
				} | null;
			} | null;
		}>;
		children: Array<{
			id: string;
			firstName: string | null;
			lastName: string | null;
			dob: string | null;
			dueDate: string | null;
			sex: string | null;
			ethnicities: string[];
		}>;
		questionnaires: Array<{
			id: string;
			createdAt: Date;
		}>;
		parentOrders: Array<{
			id: string;
			orderNumber: string;
			status: string;
			createdAt: Date;
			kits: Array<{
				id: string;
				kitNumber: number;
				child?: {
					firstName: string | null;
					lastName: string | null;
				} | null;
			}>;
		}>;
		purchaserOrders: Array<{
			id: string;
			orderNumber: string;
			status: string;
			createdAt: Date;
			kits: Array<{
				id: string;
				kitNumber: number;
				child?: {
					firstName: string | null;
					lastName: string | null;
				} | null;
			}>;
		}>;
	};
}

function formatLocalDate(
	dateString: string | Date | null,
	formatStr: string
): string {
	if (!dateString) return 'Not provided';

	if (
		typeof dateString === 'string' &&
		/^\d{4}-\d{2}-\d{2}$/.test(dateString)
	) {
		const [year, month, day] = dateString.split('-').map(Number);
		const date = new Date(year, month - 1, day);
		return format(date, formatStr);
	}

	return format(new Date(dateString), formatStr);
}

export function UserDetail({ user }: UserDetailProps) {
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

	const handleDeleteUser = async () => {
		const formData = new FormData();
		formData.append('userId', user.id);
		formData.append('userEmail', user.email);
		await deleteUser(formData);
		router.push('/admin/users');
	};

	const displayName = user.profile
		? `${user.profile.firstName} ${user.profile.lastName}`
		: user.email;

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-start justify-between">
				<div className="space-y-1">
					<Link
						href="/admin/users"
						className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
					>
						<ArrowLeftIcon className="h-4 w-4" />
						Back to Users
					</Link>
					<h1 className="text-2xl font-semibold text-foreground">
						{displayName}
					</h1>
					<div className="flex items-center gap-2">
						<Badge variant="outline">{user.role}</Badge>
						<span className="text-sm text-muted-foreground">
							Joined {format(new Date(user.createdAt), 'MMM dd, yyyy')}
						</span>
					</div>
				</div>
				<ConfirmDialog
					title="Delete User?"
					description={`Are you sure you want to delete ${displayName} (${user.email})? This will permanently delete the user and all their data including profile, consents, children, questionnaires, and orders. This action cannot be undone.`}
					onConfirm={handleDeleteUser}
				>
					<Button variant="destructive" className="text-white">
						Delete User
					</Button>
				</ConfirmDialog>
			</div>

			{/* Contact Info */}
			<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
				<div className="border border-border rounded-lg p-4 space-y-3">
					<h2 className="text-sm font-medium text-foreground flex items-center gap-2">
						<MailIcon className="h-4 w-4 text-muted-foreground" />
						Contact Information
					</h2>
					<div className="space-y-2 text-sm">
						<div>
							<span className="text-muted-foreground">Email:</span>{' '}
							<span className="text-foreground">{user.email}</span>
						</div>
						{user.profile?.phone && (
							<div>
								<span className="text-muted-foreground">Phone:</span>{' '}
								<span className="text-foreground">{user.profile.phone}</span>
							</div>
						)}
					</div>
				</div>

				{user.profile && (
					<div className="border border-border rounded-lg p-4 space-y-3">
						<h2 className="text-sm font-medium text-foreground flex items-center gap-2">
							<MapPinIcon className="h-4 w-4 text-muted-foreground" />
							Address
						</h2>
						<div className="text-sm text-foreground">
							{user.profile.address}
							{user.profile.addressLine2 && (
								<>
									<br />
									{user.profile.addressLine2}
								</>
							)}
							<br />
							{user.profile.city}, {user.profile.state} {user.profile.zipCode}
						</div>
					</div>
				)}
			</div>

			{/* Children */}
			{user.children.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-sm font-medium text-foreground flex items-center gap-2">
						<UserIcon className="h-4 w-4 text-muted-foreground" />
						Children ({user.children.length})
					</h2>
					<div className="border border-border rounded-lg divide-y divide-border">
						{user.children.map((child) => (
							<div
								key={child.id}
								className="flex items-center justify-between p-3"
							>
								<div>
									<p className="text-sm font-medium text-foreground">
										{child.firstName && child.lastName
											? `${child.firstName} ${child.lastName}`
											: 'Unborn Child'}
									</p>
									<p className="text-xs text-muted-foreground">
										{child.dob
											? `DOB: ${formatLocalDate(child.dob, 'MMM dd, yyyy')}`
											: child.dueDate
												? `Due: ${formatLocalDate(child.dueDate, 'MMM dd, yyyy')}`
												: 'No date'}
										{child.sex && ` • ${child.sex}`}
										{child.ethnicities.length > 0 &&
											` • ${child.ethnicities.join(', ')}`}
									</p>
								</div>
								<ConfirmDialog
									title="Delete Child?"
									description={`Are you sure you want to delete ${child.firstName && child.lastName ? `${child.firstName} ${child.lastName}` : 'this child'}? This cannot be undone.`}
									onConfirm={() => handleDeleteChild(child.id)}
								>
									<Button
										size="sm"
										variant="ghost"
										className="text-destructive hover:text-destructive hover:bg-destructive/10"
									>
										Delete
									</Button>
								</ConfirmDialog>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Consents */}
			{user.consents.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-sm font-medium text-foreground flex items-center gap-2">
						<FileTextIcon className="h-4 w-4 text-muted-foreground" />
						Consents ({user.consents.length})
					</h2>
					<div className="border border-border rounded-lg divide-y divide-border">
						{user.consents.map((consent) => (
							<div key={consent.id} className="p-3">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-foreground">
											{consent.kit?.order?.orderNumber
												? `Order ${consent.kit.order.orderNumber} - Kit ${consent.kit.kitNumber}`
												: 'Consent'}
										</p>
										<p className="text-xs text-muted-foreground">
											Signed by {consent.signerName || 'Unknown'}
											{consent.relationshipToChild &&
												` (${consent.relationshipToChild})`}
											{consent.signatureDate &&
												` on ${format(new Date(consent.signatureDate), 'MMM dd, yyyy')}`}
										</p>
									</div>
									<Badge variant={consent.accepted ? 'default' : 'secondary'}>
										{consent.accepted ? 'Accepted' : 'Pending'}
									</Badge>
								</div>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Questionnaires */}
			{user.questionnaires.length > 0 && (
				<div className="space-y-3">
					<h2 className="text-sm font-medium text-foreground flex items-center gap-2">
						<ClipboardIcon className="h-4 w-4 text-muted-foreground" />
						Questionnaires ({user.questionnaires.length})
					</h2>
					<div className="border border-border rounded-lg divide-y divide-border">
						{user.questionnaires.map((q) => (
							<div
								key={q.id}
								className="flex items-center justify-between p-3"
							>
								<p className="text-sm text-foreground">
									Completed {format(new Date(q.createdAt), 'MMM dd, yyyy')}
								</p>
								<ConfirmDialog
									title="Delete Questionnaire?"
									description="Are you sure you want to delete this questionnaire? This cannot be undone."
									onConfirm={() => handleDeleteQuestionnaire(q.id)}
								>
									<Button
										size="sm"
										variant="ghost"
										className="text-destructive hover:text-destructive hover:bg-destructive/10"
									>
										Delete
									</Button>
								</ConfirmDialog>
							</div>
						))}
					</div>
				</div>
			)}

			{/* Orders */}
			{(user.parentOrders.length > 0 || user.purchaserOrders.length > 0) && (
				<div className="space-y-3">
					<h2 className="text-sm font-medium text-foreground flex items-center gap-2">
						<PackageIcon className="h-4 w-4 text-muted-foreground" />
						Orders (
						{user.parentOrders.length + user.purchaserOrders.length})
					</h2>
					<div className="border border-border rounded-lg divide-y divide-border">
						{[...user.parentOrders, ...user.purchaserOrders]
							.filter(
								(order, index, self) =>
									index === self.findIndex((o) => o.id === order.id)
							)
							.map((order) => (
								<Link
									key={order.id}
									href={`/admin/orders`}
									className="flex items-center justify-between p-3 hover:bg-muted/50"
								>
									<div>
										<p className="text-sm font-medium text-foreground">
											Order {order.orderNumber}
										</p>
										<p className="text-xs text-muted-foreground">
											{order.kits.length} kit{order.kits.length !== 1 ? 's' : ''}{' '}
											• Created {format(new Date(order.createdAt), 'MMM dd, yyyy')}
										</p>
									</div>
									<Badge variant="outline" className="text-xs">
										{order.status.replace(/_/g, ' ')}
									</Badge>
								</Link>
							))}
					</div>
				</div>
			)}
		</div>
	);
}

