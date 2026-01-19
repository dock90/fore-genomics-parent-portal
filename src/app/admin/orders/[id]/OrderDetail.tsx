'use client';

import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { updateOrderStatus, deleteOrder, uploadKitReport } from '@/app/actions';
import {
	ArrowLeftIcon,
	PackageIcon,
	ClockIcon,
	CheckCircleIcon,
	Loader2,
	UploadIcon,
	DownloadIcon,
	FileTextIcon,
	FileCheckIcon,
	FileIcon,
	UserIcon,
	TruckIcon,
	ActivityIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';

interface Kit {
	id: string;
	kitNumber: number;
	kitType: string;
	reportFileName?: string | null;
	trfFileName?: string | null;
	consent?: {
		id: string;
		consentFileName?: string | null;
		accepted: boolean;
		signerName?: string | null;
		signatureDate?: Date | null;
	} | null;
	questionnaire?: {
		id: string;
	} | null;
	child?: {
		id: string;
		firstName: string | null;
		lastName: string | null;
		dob: string | null;
		dueDate: string | null;
		sex: string | null;
	} | null;
}

interface AuditLog {
	id: string;
	action: string;
	userEmail: string;
	createdAt: Date;
}

interface Order {
	id: string;
	orderNumber: string;
	status: string;
	statusUpdatedAt: Date;
	createdAt: Date;
	estimatedDelivery?: Date | null;
	outboundTrackingNumber?: string | null;
	inboundTrackingNumber?: string | null;
	notes?: string | null;
	kits: Kit[];
	auditLogs: AuditLog[];
	parent?: {
		email: string;
		profile?: {
			firstName: string;
			lastName: string;
			address: string;
			addressLine2?: string | null;
			city: string;
			state: string;
			zipCode: string;
			phone: string;
		} | null;
	} | null;
	purchaser: {
		email: string;
		profile?: {
			firstName: string;
			lastName: string;
			address: string;
			addressLine2?: string | null;
			city: string;
			state: string;
			zipCode: string;
			phone: string;
		} | null;
	};
}

interface OrderDetailProps {
	order: Order;
}

const orderStatuses = [
	'ORDER_RECEIVED',
	'ONBOARDING_COMPLETED',
	'PREPARING_ORDER',
	'SHIPPED_TO_USER',
	'DELIVERED_AWAITING_RETURN',
	'SHIPPED_TO_LAB',
	'RECEIVED_IN_PROCESS',
	'COMPLETE_REPORT_DELIVERED',
	'COMPLETE_COUNSELING_REQUIRED',
];

function getStatusBadgeVariant(status: string) {
	switch (status) {
		case 'ORDER_RECEIVED':
			return 'secondary';
		case 'ONBOARDING_COMPLETED':
			return 'secondary';
		case 'PREPARING_ORDER':
			return 'default';
		case 'SHIPPED_TO_USER':
		case 'DELIVERED_AWAITING_RETURN':
		case 'SHIPPED_TO_LAB':
			return 'outline';
		case 'RECEIVED_IN_PROCESS':
			return 'default';
		case 'COMPLETE_REPORT_DELIVERED':
		case 'COMPLETE_COUNSELING_REQUIRED':
			return 'default';
		default:
			return 'secondary';
	}
}

function getStatusIcon(status: string) {
	switch (status) {
		case 'ORDER_RECEIVED':
		case 'PREPARING_ORDER':
			return <PackageIcon className="h-4 w-4" />;
		case 'ONBOARDING_COMPLETED':
		case 'COMPLETE_REPORT_DELIVERED':
		case 'COMPLETE_COUNSELING_REQUIRED':
			return <CheckCircleIcon className="h-4 w-4" />;
		case 'SHIPPED_TO_USER':
		case 'SHIPPED_TO_LAB':
			return <TruckIcon className="h-4 w-4" />;
		case 'DELIVERED_AWAITING_RETURN':
		case 'RECEIVED_IN_PROCESS':
			return <ClockIcon className="h-4 w-4" />;
		default:
			return <PackageIcon className="h-4 w-4" />;
	}
}

export function OrderDetail({ order }: OrderDetailProps) {
	const router = useRouter();
	const [isPending, setIsPending] = useState(false);
	const [selectedStatus, setSelectedStatus] = useState(order.status);
	const [notes, setNotes] = useState(order.notes || '');
	const [trackingNumbers, setTrackingNumbers] = useState({
		outbound: order.outboundTrackingNumber || '',
		inbound: order.inboundTrackingNumber || '',
	});
	const [uploadedKits, setUploadedKits] = useState<Record<string, string>>({});
	const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
	const [uploadingKits, setUploadingKits] = useState<Record<string, boolean>>(
		{}
	);
	const formRef = useRef<HTMLFormElement>(null);

	const hasChanges = () => {
		if (selectedStatus !== order.status) return true;
		if (notes !== (order.notes || '')) return true;
		if (trackingNumbers.outbound !== (order.outboundTrackingNumber || '')) return true;
		if (trackingNumbers.inbound !== (order.inboundTrackingNumber || '')) return true;
		return false;
	};

	const handleReportUpload = async (kitId: string, file: File) => {
		const maxSize = 50 * 1024 * 1024;
		if (file.size > maxSize) {
			setFileErrors((prev) => ({
				...prev,
				[kitId]: 'File exceeds 50 MB',
			}));
			return;
		}

		setFileErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors[kitId];
			return newErrors;
		});

		setUploadingKits((prev) => ({ ...prev, [kitId]: true }));

		try {
			const formData = new FormData();
			formData.append('orderId', order.id);
			formData.append('kitId', kitId);
			formData.append('reportFile', file);

			const result = await uploadKitReport(formData);

			if (result.success) {
				toast.success('Report successfully uploaded and saved to order');
				setUploadedKits((prev) => ({ ...prev, [kitId]: file.name }));
				router.refresh();
			} else {
				toast.error('Failed to upload report', {
					description: result.message,
				});
				setFileErrors((prev) => ({
					...prev,
					[kitId]: result.message,
				}));
			}
		} catch (error) {
			toast.error('Failed to upload report', {
				description: error instanceof Error ? error.message : 'Please try again',
			});
		} finally {
			setUploadingKits((prev) => ({ ...prev, [kitId]: false }));
		}
	};

	const handleUpdateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		setIsPending(true);

		try {
			await updateOrderStatus(formData);
			toast.success('Order updated successfully');
			router.refresh();
		} catch (error) {
			toast.error('Failed to update order', {
				description:
					error instanceof Error ? error.message : 'Please try again',
			});
		} finally {
			setIsPending(false);
		}
	};

	const handleDeleteOrder = async () => {
		const formData = new FormData();
		formData.append('orderId', order.id);
		await deleteOrder(formData);
		router.push('/admin/orders');
	};

	const isUpdateDisabled = () => {
		// Disable if no changes were made
		if (!hasChanges()) return true;

		if (selectedStatus === 'SHIPPED_TO_USER') {
			return (
				!trackingNumbers.outbound?.trim() || !trackingNumbers.inbound?.trim()
			);
		}

		if (
			selectedStatus === 'COMPLETE_REPORT_DELIVERED' ||
			selectedStatus === 'COMPLETE_COUNSELING_REQUIRED'
		) {
			return !order.kits.every((kit) => {
				const hasExistingReport = !!kit.reportFileName;
				const hasNewUpload = !!uploadedKits[kit.id];
				return hasExistingReport || hasNewUpload;
			});
		}

		return false;
	};

	const getValidationMessage = () => {
		if (selectedStatus === 'SHIPPED_TO_USER') {
			if (
				!trackingNumbers.outbound?.trim() ||
				!trackingNumbers.inbound?.trim()
			) {
				return 'Both tracking numbers required to ship';
			}
		}

		if (
			selectedStatus === 'COMPLETE_REPORT_DELIVERED' ||
			selectedStatus === 'COMPLETE_COUNSELING_REQUIRED'
		) {
			const kitsWithoutReports = order.kits.filter((kit) => {
				const hasExistingReport = !!kit.reportFileName;
				const hasNewUpload = !!uploadedKits[kit.id];
				return !hasExistingReport && !hasNewUpload;
			});

			if (kitsWithoutReports.length > 0) {
				return `Reports required for: ${kitsWithoutReports.map((k) => `Kit ${k.kitNumber}`).join(', ')}`;
			}
		}

		return null;
	};

	// Download URL helpers
	const getTRFDownloadUrl = (kitId: string) => `/api/admin/kits/${kitId}/trf`;
	const getConsentDownloadUrl = (consentId: string) =>
		`/api/admin/consents/${consentId}/pdf`;
	const getReportDownloadUrl = (kitId: string) =>
		`/api/admin/kits/${kitId}/report`;

	const showTrackingFields =
		selectedStatus === 'SHIPPED_TO_USER' ||
		selectedStatus === 'DELIVERED_AWAITING_RETURN' ||
		selectedStatus === 'SHIPPED_TO_LAB' ||
		selectedStatus === 'RECEIVED_IN_PROCESS';

	return (
		<div className="space-y-6">
			{/* Back Link */}
			<Link
				href="/admin/orders"
				className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
			>
				<ArrowLeftIcon className="h-4 w-4" />
				Back to Orders
			</Link>

			{/* Header */}
			<div className="flex items-start justify-between">
				<div>
					<div className="flex items-center gap-3">
						<h1 className="text-2xl font-semibold text-foreground">
							Order #{order.orderNumber}
						</h1>
						<Badge
							variant={getStatusBadgeVariant(order.status)}
							className="gap-1"
						>
							{getStatusIcon(order.status)}
							{order.status.replace(/_/g, ' ')}
						</Badge>
					</div>
					<p className="text-muted-foreground mt-1">
						Created {format(new Date(order.createdAt), 'MMM dd, yyyy')} • Last
						updated{' '}
						{format(new Date(order.statusUpdatedAt), 'MMM dd, yyyy HH:mm')}
					</p>
				</div>

				<ConfirmDialog
					title="Delete Order?"
					description={`Are you sure you want to delete Order #${order.orderNumber}? This will permanently delete all associated kits and data. This action cannot be undone.`}
					onConfirm={handleDeleteOrder}
				>
					<Button
						variant="outline"
						className="text-destructive border-destructive hover:bg-destructive/10"
					>
						Delete Order
					</Button>
				</ConfirmDialog>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Main Content */}
				<div className="lg:col-span-2 space-y-6">
					{/* Status & Actions Form */}
					<form
						id="order-form"
						ref={formRef}
						onSubmit={handleUpdateOrder}
						className="border border-border rounded-lg p-4 space-y-4"
					>
						<h2 className="text-sm font-medium text-foreground">
							Order Status & Actions
						</h2>

						<input type="hidden" name="orderId" value={order.id} />

						<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label className="text-xs font-medium text-muted-foreground">
									Status
								</label>
								<Select
									name="status"
									value={selectedStatus}
									onValueChange={setSelectedStatus}
								>
									<SelectTrigger className="mt-1">
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										{orderStatuses.map((status) => (
											<SelectItem key={status} value={status}>
												{status.replace(/_/g, ' ')}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div>
								<label className="text-xs font-medium text-muted-foreground">
									Notes
								</label>
								<Textarea
									name="notes"
									placeholder="Add notes..."
									value={notes}
									onChange={(e) => setNotes(e.target.value)}
									className="mt-1 min-h-[38px] resize-none"
									rows={1}
								/>
							</div>
						</div>

						{/* Tracking Numbers */}
						{showTrackingFields && (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Outbound Tracking
									</label>
									<Input
										name="outboundTrackingNumber"
										placeholder="Enter outbound tracking..."
										value={trackingNumbers.outbound}
										onChange={(e) =>
											setTrackingNumbers((prev) => ({
												...prev,
												outbound: e.target.value,
											}))
										}
										className="mt-1"
									/>
								</div>
								<div>
									<label className="text-xs font-medium text-muted-foreground">
										Inbound Tracking
									</label>
									<Input
										name="inboundTrackingNumber"
										placeholder="Enter inbound tracking..."
										value={trackingNumbers.inbound}
										onChange={(e) =>
											setTrackingNumbers((prev) => ({
												...prev,
												inbound: e.target.value,
											}))
										}
										className="mt-1"
									/>
								</div>
							</div>
						)}

						<div className="flex items-center gap-3 pt-2">
							<Button
								type="submit"
								className="bg-fore-blue hover:bg-fore-blue/90"
								disabled={isPending || isUpdateDisabled()}
							>
								{isPending ? (
									<>
										<Loader2 className="mr-2 h-4 w-4 animate-spin" />
										Saving...
									</>
								) : (
									'Save Changes'
								)}
							</Button>
							{getValidationMessage() && (
								<p className="text-xs text-amber-600">
									{getValidationMessage()}
								</p>
							)}
						</div>
					</form>

					{/* Kits Section */}
					<div className="border border-border rounded-lg overflow-hidden">
						<div className="bg-muted/50 px-4 py-3 border-b border-border">
							<h2 className="text-sm font-medium text-foreground">
								Kits ({order.kits.length})
							</h2>
						</div>

						<div className="divide-y divide-border">
							{order.kits.map((kit) => {
								const hasExistingReport = !!kit.reportFileName;
								const hasConsent = !!kit.consent?.id;
								const hasTRF = !!kit.trfFileName || !!kit.questionnaire;
								const recentlyUploaded = uploadedKits[kit.id];

								return (
									<div key={kit.id} className="p-4 space-y-3">
										{/* Kit Header */}
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3">
												<span className="font-medium text-foreground">
													Kit {kit.kitNumber}
												</span>
												<Badge variant="outline" className="text-xs">
													{kit.kitType}
												</Badge>
												{kit.child && (
													<span className="text-sm text-muted-foreground">
														{kit.child.firstName || 'Unknown'}{' '}
														{kit.child.lastName || ''}
														{kit.child.dob && ` • DOB: ${kit.child.dob}`}
													</span>
												)}
											</div>

											{/* Document Status */}
											<div className="flex items-center gap-1.5">
												{hasTRF && (
													<Badge
														variant="outline"
														className="text-xs gap-1 bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/30 dark:text-blue-400 dark:border-blue-800"
													>
														<FileTextIcon className="h-3 w-3" />
														TRF
													</Badge>
												)}
												{hasConsent && (
													<Badge
														variant="outline"
														className="text-xs gap-1 bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-950/30 dark:text-purple-400 dark:border-purple-800"
													>
														<FileCheckIcon className="h-3 w-3" />
														Consent
													</Badge>
												)}
												{(hasExistingReport || recentlyUploaded) && (
													<Badge
														variant="outline"
														className="text-xs gap-1 bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
													>
														<FileIcon className="h-3 w-3" />
														Report
													</Badge>
												)}
											</div>
										</div>

										{/* Actions Row */}
										<div className="flex items-center justify-between">
											{/* Download Buttons */}
											<div className="flex items-center gap-2">
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={!hasTRF}
													onClick={() =>
														window.open(getTRFDownloadUrl(kit.id), '_blank')
													}
												>
													<DownloadIcon className="h-3.5 w-3.5 mr-1.5" />
													TRF
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={!hasConsent}
													onClick={() =>
														window.open(
															getConsentDownloadUrl(kit.consent!.id),
															'_blank'
														)
													}
												>
													<DownloadIcon className="h-3.5 w-3.5 mr-1.5" />
													Consent
												</Button>
												<Button
													type="button"
													variant="outline"
													size="sm"
													disabled={!hasExistingReport && !recentlyUploaded}
													onClick={() =>
														window.open(getReportDownloadUrl(kit.id), '_blank')
													}
												>
													<DownloadIcon className="h-3.5 w-3.5 mr-1.5" />
													Report
												</Button>
											</div>

											{/* Upload Report */}
											<div className="flex items-center gap-2">
												{uploadingKits[kit.id] && (
													<div className="flex items-center gap-2 text-xs text-muted-foreground">
														<Loader2 className="h-3.5 w-3.5 animate-spin" />
														<span>Uploading...</span>
													</div>
												)}

												{!uploadingKits[kit.id] && fileErrors[kit.id] && (
													<span className="text-xs text-destructive">
														{fileErrors[kit.id]}
													</span>
												)}

												<input
													type="file"
													accept=".pdf,.doc,.docx,.txt"
													onChange={(e) => {
														const file = e.target.files?.[0];
														if (file) {
															handleReportUpload(kit.id, file);
														}
														e.target.value = '';
													}}
													className="hidden"
													id={`file-${kit.id}`}
													disabled={uploadingKits[kit.id]}
												/>
												<label
													htmlFor={`file-${kit.id}`}
													className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
														uploadingKits[kit.id]
															? 'bg-muted text-muted-foreground cursor-not-allowed'
															: 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90'
													}`}
												>
													{uploadingKits[kit.id] ? (
														<>
															<Loader2 className="h-3.5 w-3.5 animate-spin" />
															Uploading...
														</>
													) : (
														<>
															<UploadIcon className="h-3.5 w-3.5" />
															{hasExistingReport || recentlyUploaded
																? 'Replace Report'
																: 'Upload Report'}
														</>
													)}
												</label>
											</div>
										</div>
									</div>
								);
							})}
						</div>
					</div>
				</div>

				{/* Sidebar */}
				<div className="space-y-6">
					{/* Customer Info */}
					<div className="border border-border rounded-lg p-4 space-y-4">
						<h2 className="text-sm font-medium text-foreground flex items-center gap-2">
							<UserIcon className="h-4 w-4 text-muted-foreground" />
							Customer Information
						</h2>

						<div className="space-y-3">
							<div>
								<p className="text-xs font-medium text-muted-foreground">
									Purchaser
								</p>
								<p className="text-sm text-foreground">
									{order.purchaser.profile?.firstName}{' '}
									{order.purchaser.profile?.lastName}
								</p>
								<p className="text-xs text-muted-foreground">
									{order.purchaser.email}
								</p>
							</div>

							<div>
								<p className="text-xs font-medium text-muted-foreground">
									Address
								</p>
								{order.purchaser.profile?.address ? (
									<>
										<p className="text-sm text-foreground">
											{order.purchaser.profile.address}
											{order.purchaser.profile.addressLine2 && (
												<>, {order.purchaser.profile.addressLine2}</>
											)}
										</p>
										<p className="text-sm text-foreground">
											{order.purchaser.profile.city},{' '}
											{order.purchaser.profile.state}{' '}
											{order.purchaser.profile.zipCode}
										</p>
									</>
								) : (
									<p className="text-sm text-muted-foreground italic">
										No address data yet
									</p>
								)}
							</div>

							{order.purchaser.profile?.phone && (
								<div>
									<p className="text-xs font-medium text-muted-foreground">
										Phone
									</p>
									<p className="text-sm text-foreground">
										{order.purchaser.profile.phone}
									</p>
								</div>
							)}

							{order.parent && order.parent.email !== order.purchaser.email && (
								<div className="pt-3 border-t border-border">
									<p className="text-xs font-medium text-muted-foreground">
										Parent (different from purchaser)
									</p>
									<p className="text-sm text-foreground">
										{order.parent.profile?.firstName}{' '}
										{order.parent.profile?.lastName}
									</p>
									<p className="text-xs text-muted-foreground">
										{order.parent.email}
									</p>
								</div>
							)}
						</div>
					</div>

					{/* Tracking Info */}
					{(order.outboundTrackingNumber || order.inboundTrackingNumber) && (
						<div className="border border-border rounded-lg p-4 space-y-3">
							<h2 className="text-sm font-medium text-foreground flex items-center gap-2">
								<TruckIcon className="h-4 w-4 text-muted-foreground" />
								Tracking
							</h2>

							{order.outboundTrackingNumber && (
								<div>
									<p className="text-xs font-medium text-muted-foreground">
										Outbound
									</p>
									<p className="text-sm text-foreground font-mono">
										{order.outboundTrackingNumber}
									</p>
								</div>
							)}

							{order.inboundTrackingNumber && (
								<div>
									<p className="text-xs font-medium text-muted-foreground">
										Inbound
									</p>
									<p className="text-sm text-foreground font-mono">
										{order.inboundTrackingNumber}
									</p>
								</div>
							)}
						</div>
					)}

					{/* Recent Activity */}
					{order.auditLogs.length > 0 && (
						<div className="border border-border rounded-lg p-4 space-y-3">
							<h2 className="text-sm font-medium text-foreground flex items-center gap-2">
								<ActivityIcon className="h-4 w-4 text-muted-foreground" />
								Recent Activity
							</h2>

							<div className="space-y-2">
								{order.auditLogs.map((log) => (
									<div key={log.id} className="text-xs">
										<p className="text-foreground">
											{log.action.replace(/_/g, ' ')}
										</p>
										<p className="text-muted-foreground">
											{log.userEmail} •{' '}
											{format(new Date(log.createdAt), 'MMM dd, HH:mm')}
										</p>
									</div>
								))}
							</div>
						</div>
					)}
				</div>
			</div>
		</div>
	);
}
