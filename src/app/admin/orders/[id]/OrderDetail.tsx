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
import { updateOrderStatus, deleteOrder, uploadKitReport, uploadSignedTRFConsent } from '@/app/actions';
import { ReportType } from '@/lib/report-types';
import {
	ArrowLeftIcon,
	PackageIcon,
	ClockIcon,
	CheckCircleIcon,
	Loader2,
	UploadIcon,
	DownloadIcon,
	FileTextIcon,
	UserIcon,
	TruckIcon,
	ActivityIcon,
} from 'lucide-react';
import { dateFormats } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useState, useRef } from 'react';
import Link from 'next/link';

interface Kit {
	id: string;
	kitNumber: number;
	kitType: string;
	reportFileName?: string | null;
	parentReportFileName?: string | null;
	pediatricianReportFileName?: string | null;
	fullLabReportFileName?: string | null;
	trfFileName?: string | null;
	trfApprovedFileName?: string | null;
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

// Report type configurations for UI
const REPORT_TYPES: { type: ReportType; label: string; color: string }[] = [
	{ type: 'legacy', label: 'Report (Original)', color: 'gray' },
	{ type: 'parent', label: 'Parent Report', color: 'green' },
	{ type: 'pediatrician', label: 'Pediatrician Report', color: 'blue' },
	{ type: 'fullLab', label: 'Full Lab Report', color: 'purple' },
];


const getReportFileName = (kit: Kit, reportType: ReportType): string | null | undefined => {
	switch (reportType) {
		case 'parent':
			return kit.parentReportFileName;
		case 'pediatrician':
			return kit.pediatricianReportFileName;
		case 'fullLab':
			return kit.fullLabReportFileName;
		case 'legacy':
		default:
			return kit.reportFileName;
	}
};

function formatPhone(phone: string): string {
	if (!phone) return 'Not provided';
	const digits = phone.replace(/\D/g, '');
	if (digits.length === 10) {
		return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
	}
	if (digits.length === 11 && digits.startsWith('1')) {
		return `(${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
	}
	return phone;
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
		id: string;
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
		id: string;
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
	'COMPLETE_NO_COUNSELING_REQUIRED',
];

const statusDisplayNames: Record<string, string> = {
	ORDER_RECEIVED: 'Order Received',
	ONBOARDING_COMPLETED: 'Onboarding Completed',
	PREPARING_ORDER: 'Preparing Order',
	SHIPPED_TO_USER: 'Shipped to User',
	DELIVERED_AWAITING_RETURN: 'Delivered Awaiting Return',
	SHIPPED_TO_LAB: 'Shipped to Lab',
	RECEIVED_IN_PROCESS: 'Received in Process',
	COMPLETE_REPORT_DELIVERED: 'Complete (Report Delivered/Counseling Required)',
	COMPLETE_NO_COUNSELING_REQUIRED: 'Complete (Report Delivered/No Counseling)',
};

function getStatusDisplayName(status: string) {
	return statusDisplayNames[status] ?? status.replace(/_/g, ' ');
}

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
		case 'COMPLETE_NO_COUNSELING_REQUIRED':
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
		case 'COMPLETE_NO_COUNSELING_REQUIRED':
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
	// Track uploads by kitId-reportType key (e.g., "kit123-parent")
	const [uploadedKits, setUploadedKits] = useState<Record<string, string>>({});
	const [fileErrors, setFileErrors] = useState<Record<string, string>>({});
	const [uploadingKits, setUploadingKits] = useState<Record<string, boolean>>(
		{}
	);
	const formRef = useRef<HTMLFormElement>(null);
	const [generatingTRFs, setGeneratingTRFs] = useState<Record<string, boolean>>({});
	const [trfErrors, setTrfErrors] = useState<Record<string, string>>({});

	const handleGenerateTRF = async (kitId: string) => {
		setGeneratingTRFs((prev) => ({ ...prev, [kitId]: true }));
		setTrfErrors((prev) => {
			const next = { ...prev };
			delete next[kitId];
			return next;
		});

		try {
			const res = await fetch(`/api/admin/kits/${kitId}/trf`, {
				method: 'POST',
			});
			const data = await res.json();

			if (!res.ok) {
				setTrfErrors((prev) => ({
					...prev,
					[kitId]: data.error || 'Failed to generate TRF',
				}));
			} else {
				router.refresh();
			}
		} catch (error) {
			setTrfErrors((prev) => ({
				...prev,
				[kitId]: error instanceof Error ? error.message : 'Failed to generate TRF',
			}));
		} finally {
			setGeneratingTRFs((prev) => ({ ...prev, [kitId]: false }));
		}
	};

	const [uploadingSignedTRF, setUploadingSignedTRF] = useState<Record<string, boolean>>({});
	const [signedTRFErrors, setSignedTRFErrors] = useState<Record<string, string>>({});

	const handleSignedTRFUpload = async (kitId: string, file: File) => {
		const maxSize = 50 * 1024 * 1024;
		if (file.size > maxSize) {
			setSignedTRFErrors((prev) => ({ ...prev, [kitId]: 'File exceeds 50 MB' }));
			return;
		}

		setSignedTRFErrors((prev) => {
			const next = { ...prev };
			delete next[kitId];
			return next;
		});
		setUploadingSignedTRF((prev) => ({ ...prev, [kitId]: true }));

		try {
			const formData = new FormData();
			formData.append('kitId', kitId);
			formData.append('file', file);

			const result = await uploadSignedTRFConsent(formData);

			if (result.success) {
				router.refresh();
			} else {
				setSignedTRFErrors((prev) => ({ ...prev, [kitId]: result.message }));
			}
		} catch (error) {
			setSignedTRFErrors((prev) => ({
				...prev,
				[kitId]: error instanceof Error ? error.message : 'Upload failed',
			}));
		} finally {
			setUploadingSignedTRF((prev) => ({ ...prev, [kitId]: false }));
		}
	};

	// Helper to generate unique key for kit + report type combination
	const getUploadKey = (kitId: string, reportType: ReportType) => `${kitId}-${reportType}`;

	const hasChanges = () => {
		if (selectedStatus !== order.status) return true;
		if (notes !== (order.notes || '')) return true;
		if (trackingNumbers.outbound !== (order.outboundTrackingNumber || '')) return true;
		if (trackingNumbers.inbound !== (order.inboundTrackingNumber || '')) return true;
		return false;
	};

	const handleReportUpload = async (kitId: string, file: File, reportType: ReportType) => {
		const uploadKey = getUploadKey(kitId, reportType);
		const maxSize = 50 * 1024 * 1024;
		if (file.size > maxSize) {
			setFileErrors((prev) => ({
				...prev,
				[uploadKey]: 'File exceeds 50 MB',
			}));
			return;
		}

		setFileErrors((prev) => {
			const newErrors = { ...prev };
			delete newErrors[uploadKey];
			return newErrors;
		});

		setUploadingKits((prev) => ({ ...prev, [uploadKey]: true }));

		try {
			const formData = new FormData();
			formData.append('orderId', order.id);
			formData.append('kitId', kitId);
			formData.append('reportFile', file);
			formData.append('reportType', reportType);

			const result = await uploadKitReport(formData);

			if (result.success) {
				setUploadedKits((prev) => ({ ...prev, [uploadKey]: file.name }));
				router.refresh();
			} else {
				setFileErrors((prev) => ({
					...prev,
					[uploadKey]: result.message,
				}));
			}
		} catch (error) {
			setFileErrors((prev) => ({
				...prev,
				[uploadKey]: error instanceof Error ? error.message : 'Upload failed',
			}));
		} finally {
			setUploadingKits((prev) => ({ ...prev, [uploadKey]: false }));
		}
	};

	const handleUpdateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);

		setIsPending(true);

		try {
			await updateOrderStatus(formData);
			router.refresh();
		} catch {
			// Error handling - order update failed
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
			selectedStatus === 'COMPLETE_NO_COUNSELING_REQUIRED'
		) {
			return !order.kits.every((kit) => {
				const hasAnyReport = REPORT_TYPES.some(({ type }) => {
					const hasExisting = !!getReportFileName(kit, type);
					const hasNewUpload = !!uploadedKits[getUploadKey(kit.id, type)];
					return hasExisting || hasNewUpload;
				});
				return hasAnyReport;
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
			selectedStatus === 'COMPLETE_NO_COUNSELING_REQUIRED'
		) {
			const kitsWithoutReports = order.kits.filter((kit) => {
				const hasAnyReport = REPORT_TYPES.some(({ type }) => {
					const hasExisting = !!getReportFileName(kit, type);
					const hasNewUpload = !!uploadedKits[getUploadKey(kit.id, type)];
					return hasExisting || hasNewUpload;
				});
				return !hasAnyReport;
			});

			if (kitsWithoutReports.length > 0) {
				return `Reports required for: ${kitsWithoutReports.map((k) => `Kit ${k.kitNumber}`).join(', ')}`;
			}
		}

		return null;
	};

	// Download URL helpers
	const getTRFDownloadUrl = (kitId: string) => `/api/admin/kits/${kitId}/trf`;
	const getSignedTRFDownloadUrl = (kitId: string) => `/api/admin/kits/${kitId}/trf/signed`;
	const getReportDownloadUrl = (kitId: string, reportType: ReportType = 'legacy') =>
		`/api/admin/kits/${kitId}/report?type=${reportType}`;

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
							{getStatusDisplayName(order.status)}
						</Badge>
					</div>
					<p className="text-muted-foreground mt-1">
						Created {dateFormats.short(new Date(order.createdAt))} • Last
						updated{' '}
						{dateFormats.shortWithTime24(new Date(order.statusUpdatedAt))}
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
												{getStatusDisplayName(status)}
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
								const hasTRF = !!kit.trfFileName;
								const hasSignedTRF = !!kit.trfApprovedFileName;
								const isOnboardingComplete = !!kit.child && !!kit.consent && !!kit.questionnaire;
								const isGenerating = generatingTRFs[kit.id];
								const trfError = trfErrors[kit.id];
								const isUploadingSigned = uploadingSignedTRF[kit.id];
								const signedError = signedTRFErrors[kit.id];

								return (
									<div key={kit.id} className="p-4">
										{/* Kit Header */}
										<div className="flex items-center justify-between mb-3">
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
										</div>

										{/* Documents Table */}
										<div>
											{/* Section: Documents */}
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-2 px-2 bg-muted/50 border-y border-border">
												Documents
											</div>

											{/* TRF / Consent Row */}
											<div className="flex items-center justify-between py-2.5 px-2 border-b border-border">
												<div className="flex items-center gap-3">
													<div className={`w-1.5 h-1.5 rounded-full ${hasTRF ? 'bg-blue-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
													<span className="text-sm text-foreground">TRF / Consent</span>
													{hasTRF && (
														<span className="text-xs text-green-600 dark:text-green-400">Available</span>
													)}
													{isGenerating && (
														<span className="text-xs text-muted-foreground flex items-center gap-1">
															<Loader2 className="h-3 w-3 animate-spin" />
															Generating...
														</span>
													)}
													{!isGenerating && trfError && (
														<span className="text-xs text-destructive">{trfError}</span>
													)}
												</div>
												<div className="flex items-center gap-1">
													{hasTRF && (
														<Button
															type="button"
															variant="ghost"
															size="sm"
															className="h-7 text-xs"
															onClick={() => window.open(getTRFDownloadUrl(kit.id), '_blank')}
														>
															<DownloadIcon className="h-3 w-3 mr-1" />
															Download
														</Button>
													)}
													{isOnboardingComplete && (
														<Button
															type="button"
															variant="outline"
															size="sm"
															className="h-7 text-xs"
															disabled={isGenerating}
															onClick={() => handleGenerateTRF(kit.id)}
														>
															{isGenerating ? (
																<Loader2 className="h-3 w-3 mr-1 animate-spin" />
															) : (
																<FileTextIcon className="h-3 w-3 mr-1" />
															)}
															{hasTRF ? 'Regenerate' : 'Generate'}
														</Button>
													)}
												</div>
											</div>

											{/* Signed TRF / Consent Row */}
											<div className="flex items-center justify-between py-2.5 px-2 border-b border-border">
												<div className="flex items-center gap-3">
													<div className={`w-1.5 h-1.5 rounded-full ${hasSignedTRF ? 'bg-purple-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
													<span className="text-sm text-foreground">Signed TRF / Consent</span>
													{hasSignedTRF && (
														<span className="text-xs text-green-600 dark:text-green-400">Uploaded</span>
													)}
													{isUploadingSigned && (
														<span className="text-xs text-muted-foreground flex items-center gap-1">
															<Loader2 className="h-3 w-3 animate-spin" />
															Uploading...
														</span>
													)}
													{!isUploadingSigned && signedError && (
														<span className="text-xs text-destructive">{signedError}</span>
													)}
												</div>
												<div className="flex items-center gap-1">
													{hasSignedTRF && (
														<Button
															type="button"
															variant="ghost"
															size="sm"
															className="h-7 text-xs"
															onClick={() => window.open(getSignedTRFDownloadUrl(kit.id), '_blank')}
														>
															<DownloadIcon className="h-3 w-3 mr-1" />
															Download
														</Button>
													)}
													{hasTRF && (
														<>
															<input
																type="file"
																accept=".pdf"
																onChange={(e) => {
																	const file = e.target.files?.[0];
																	if (file) {
																		handleSignedTRFUpload(kit.id, file);
																	}
																	e.target.value = '';
																}}
																className="hidden"
																id={`signed-trf-${kit.id}`}
																disabled={isUploadingSigned}
															/>
															<label
																htmlFor={`signed-trf-${kit.id}`}
																className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
																	isUploadingSigned
																		? 'bg-muted text-muted-foreground cursor-not-allowed'
																		: 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90'
																}`}
															>
																<UploadIcon className="h-3 w-3" />
																{hasSignedTRF ? 'Replace' : 'Upload'}
															</label>
														</>
													)}
												</div>
											</div>

											{/* Section: Reports */}
											<div className="text-xs font-medium text-muted-foreground uppercase tracking-wide py-2 px-2 bg-muted/50 border-b border-border">
												Reports
											</div>

											{/* Report Rows */}
											{REPORT_TYPES.filter(({ type }) => {
												if (type === 'legacy') {
													const uploadKey = getUploadKey(kit.id, type);
													return !!getReportFileName(kit, type) || !!uploadedKits[uploadKey];
												}
												return true;
											}).map(({ type, label }, index, arr) => {
												const uploadKey = getUploadKey(kit.id, type);
												const hasExisting = !!getReportFileName(kit, type);
												const recentlyUploaded = !!uploadedKits[uploadKey];
												const hasReport = hasExisting || recentlyUploaded;
												const isUploading = uploadingKits[uploadKey];
												const error = fileErrors[uploadKey];
												const isLast = index === arr.length - 1;

												return (
													<div key={type} className={`flex items-center justify-between py-2.5 px-2 ${!isLast ? 'border-b border-border' : ''}`}>
														<div className="flex items-center gap-3">
															<div className={`w-1.5 h-1.5 rounded-full ${hasReport ? 'bg-green-500' : 'bg-gray-300 dark:bg-gray-600'}`} />
															<span className="text-sm text-foreground">{label}</span>
															{hasReport && (
																<span className="text-xs text-green-600 dark:text-green-400">Uploaded</span>
															)}
															{isUploading && (
																<span className="text-xs text-muted-foreground flex items-center gap-1">
																	<Loader2 className="h-3 w-3 animate-spin" />
																	Uploading...
																</span>
															)}
															{!isUploading && error && (
																<span className="text-xs text-destructive">{error}</span>
															)}
														</div>

														<div className="flex items-center gap-1">
															{hasReport && (
																<Button
																	type="button"
																	variant="ghost"
																	size="sm"
																	className="h-7 text-xs"
																	onClick={() => window.open(getReportDownloadUrl(kit.id, type), '_blank')}
																>
																	<DownloadIcon className="h-3 w-3 mr-1" />
																	Download
																</Button>
															)}

															<input
																type="file"
																accept=".pdf,.doc,.docx,.txt"
																onChange={(e) => {
																	const file = e.target.files?.[0];
																	if (file) {
																		handleReportUpload(kit.id, file, type);
																	}
																	e.target.value = '';
																}}
																className="hidden"
																id={`file-${kit.id}-${type}`}
																disabled={isUploading}
															/>
															<label
																htmlFor={`file-${kit.id}-${type}`}
																className={`inline-flex items-center gap-1 px-2 py-1 text-xs font-medium rounded transition-colors ${
																	isUploading
																		? 'bg-muted text-muted-foreground cursor-not-allowed'
																		: 'bg-primary text-primary-foreground cursor-pointer hover:bg-primary/90'
																}`}
															>
																<UploadIcon className="h-3 w-3" />
																{hasReport ? 'Replace' : 'Upload'}
															</label>
														</div>
													</div>
												);
											})}
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
								<Link
									href={`/admin/users/${order.purchaser.id}`}
									className="text-sm text-fore-blue hover:underline font-medium"
								>
									{order.purchaser.profile?.firstName}{' '}
									{order.purchaser.profile?.lastName}
								</Link>
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
										{formatPhone(order.purchaser.profile.phone)}
									</p>
								</div>
							)}

							{order.parent && order.parent.email !== order.purchaser.email && (
								<div className="pt-3 border-t border-border">
									<p className="text-xs font-medium text-muted-foreground">
										Parent (different from purchaser)
									</p>
									<Link
										href={`/admin/users/${order.parent.id}`}
										className="text-sm text-fore-blue hover:underline font-medium"
									>
										{order.parent.profile?.firstName}{' '}
										{order.parent.profile?.lastName}
									</Link>
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
											{dateFormats.shortNoYear(new Date(log.createdAt))}
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
