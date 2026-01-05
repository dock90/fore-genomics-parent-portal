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
import { updateOrderStatus, deleteOrder } from '../actions';
import {
	PackageIcon,
	ClockIcon,
	CheckCircleIcon,
	Loader2,
	UploadIcon,
	FileIcon,
} from 'lucide-react';
import { format } from 'date-fns';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { flushSync } from 'react-dom';

interface Order {
	id: string;
	orderNumber: string;
	status: string;
	statusUpdatedAt: Date;
	estimatedDelivery?: Date | null;
	outboundTrackingNumber?: string | null;
	inboundTrackingNumber?: string | null;
	notes?: string | null;
	kits: {
		id: string;
		kitNumber: number;
		kitType: string;
		reportFileName?: string | null;
		child?: {
			id: string;
			userId: string;
			firstName: string | null;
			lastName: string | null;
			dob: string | null;
			dueDate: string | null;
			sex: string | null;
			ethnicities: string[];
			createdAt: Date;
			updatedAt: Date;
		} | null;
	}[];
	parent?: {
		email: string;
		profile?: {
			id: string;
			userId: string;
			firstName: string;
			lastName: string;
			address: string;
			city: string;
			state: string;
			zipCode: string;
			phone: string;
			createdAt: Date;
			updatedAt: Date;
		} | null;
	} | null;
	purchaser: {
		email: string;
		profile?: {
			id: string;
			userId: string;
			firstName: string;
			lastName: string;
			address: string;
			city: string;
			state: string;
			zipCode: string;
			phone: string;
			createdAt: Date;
			updatedAt: Date;
		} | null;
	};
}

interface OrdersManagementProps {
	orders: Order[];
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
			return 'outline';
		case 'DELIVERED_AWAITING_RETURN':
			return 'outline';
		case 'SHIPPED_TO_LAB':
			return 'outline';
		case 'RECEIVED_IN_PROCESS':
			return 'default';
		case 'COMPLETE_REPORT_DELIVERED':
			return 'default';
		default:
			return 'secondary';
	}
}

function getStatusIcon(status: string) {
	switch (status) {
		case 'ORDER_RECEIVED':
			return <PackageIcon className="h-3 w-3" />;
		case 'ONBOARDING_COMPLETED':
			return <CheckCircleIcon className="h-3 w-3" />;
		case 'PREPARING_ORDER':
			return <PackageIcon className="h-3 w-3" />;
		case 'SHIPPED_TO_USER':
			return <PackageIcon className="h-3 w-3" />;
		case 'DELIVERED_AWAITING_RETURN':
			return <ClockIcon className="h-3 w-3" />;
		case 'SHIPPED_TO_LAB':
			return <PackageIcon className="h-3 w-3" />;
		case 'RECEIVED_IN_PROCESS':
			return <ClockIcon className="h-3 w-3" />;
		case 'COMPLETE_REPORT_DELIVERED':
			return <CheckCircleIcon className="h-3 w-3" />;
		default:
			return <PackageIcon className="h-3 w-3" />;
	}
}

export function OrdersManagement({ orders }: OrdersManagementProps) {
	const router = useRouter();
	const [pendingOrders, setPendingOrders] = useState<Set<string>>(new Set());
	const [selectedStatuses, setSelectedStatuses] = useState<
		Record<string, string>
	>({});
	const [trackingNumbers, setTrackingNumbers] = useState<
		Record<string, { outbound: string; inbound: string }>
	>({});
	const [reportFiles, setReportFiles] = useState<Record<string, File | null>>(
		{}
	);
	const [fileErrors, setFileErrors] = useState<Record<string, string>>({});

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

	const handleUpdateOrder = async (e: React.FormEvent<HTMLFormElement>) => {
		e.preventDefault();
		const formData = new FormData(e.currentTarget);
		const orderId = formData.get('orderId') as string;

		flushSync(() => {
			setPendingOrders((prev) => {
				const next = new Set(prev);
				next.add(orderId);
				return next;
			});
		});

		try {
			await updateOrderStatus(formData);
			router.refresh();
		} catch (error) {
		} finally {
			setPendingOrders((prev) => {
				const next = new Set(prev);
				next.delete(orderId);
				return next;
			});
		}
	};

	const handleTrackingNumberChange = (
		orderId: string,
		type: 'outbound' | 'inbound',
		value: string
	) => {
		setTrackingNumbers((prev) => ({
			...prev,
			[orderId]: {
				...prev[orderId],
				[type]: value,
			},
		}));
	};

	const isUpdateDisabled = (order: Order, selectedStatus: string) => {
		if (selectedStatus === 'SHIPPED_TO_USER') {
			const currentTracking = trackingNumbers[order.id] || {
				outbound: order.outboundTrackingNumber || '',
				inbound: order.inboundTrackingNumber || '',
			};
			return (
				!currentTracking.outbound?.trim() || !currentTracking.inbound?.trim()
			);
		}

		if (selectedStatus === 'COMPLETE_REPORT_DELIVERED') {
			const allKitsHaveReports = order.kits.every((kit) => {
				const hasExistingReport =
					kit.reportFileName !== null && kit.reportFileName !== undefined;
				const hasNewReport = reportFiles[`${order.id}-${kit.id}`] !== undefined;
				return hasExistingReport || hasNewReport;
			});
			return !allKitsHaveReports;
		}

		if (selectedStatus === 'COMPLETE_COUNSELING_REQUIRED') {
			const allKitsHaveReports = order.kits.every((kit) => {
				const hasExistingReport =
					kit.reportFileName !== null && kit.reportFileName !== undefined;
				const hasNewReport = reportFiles[`${order.id}-${kit.id}`] !== undefined;
				return hasExistingReport || hasNewReport;
			});
			return !allKitsHaveReports;
		}

		return false;
	};

	const getValidationMessage = (order: Order, selectedStatus: string) => {
		if (selectedStatus === 'SHIPPED_TO_USER') {
			const currentTracking = trackingNumbers[order.id] || {
				outbound: order.outboundTrackingNumber || '',
				inbound: order.inboundTrackingNumber || '',
			};
			if (
				!currentTracking.outbound?.trim() ||
				!currentTracking.inbound?.trim()
			) {
				return 'Both tracking numbers required';
			}
		}

		if (selectedStatus === 'COMPLETE_REPORT_DELIVERED') {
			const kitsWithoutReports = order.kits.filter((kit) => {
				const hasExistingReport =
					kit.reportFileName !== null && kit.reportFileName !== undefined;
				const hasNewReport = reportFiles[`${order.id}-${kit.id}`] !== undefined;
				return !hasExistingReport && !hasNewReport;
			});

			if (kitsWithoutReports.length > 0) {
				const kitNumbers = kitsWithoutReports
					.map((kit) => `Kit ${kit.kitNumber}`)
					.join(', ');
				return `Reports required for: ${kitNumbers}`;
			}
		}

		if (selectedStatus === 'COMPLETE_COUNSELING_REQUIRED') {
			const kitsWithoutReports = order.kits.filter((kit) => {
				const hasExistingReport =
					kit.reportFileName !== null && kit.reportFileName !== undefined;
				const hasNewReport = reportFiles[`${order.id}-${kit.id}`] !== undefined;
				return !hasExistingReport && !hasNewReport;
			});

			if (kitsWithoutReports.length > 0) {
				const kitNumbers = kitsWithoutReports
					.map((kit) => `Kit ${kit.kitNumber}`)
					.join(', ');
				return `Reports required for: ${kitNumbers}`;
			}
		}

		return null;
	};

	const handleDeleteOrder = async (orderId: string) => {
		const formData = new FormData();
		formData.append('orderId', orderId);
		await deleteOrder(formData);
		router.refresh();
	};

	const handleStatusChange = (orderId: string, status: string) => {
		setSelectedStatuses((prev) => ({
			...prev,
			[orderId]: status,
		}));
	};

	if (orders.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg">
				<PackageIcon className="h-10 w-10 text-muted-foreground mb-3" />
				<h2 className="text-base font-medium text-foreground mb-1">
					No orders found
				</h2>
				<p className="text-sm text-muted-foreground">
					No orders have been created yet.
				</p>
			</div>
		);
	}

	return (
		<div className="space-y-4">
			{orders.map((order) => (
				<div
					key={order.id}
					className="border border-border rounded-lg p-4 space-y-4"
				>
					<div className="flex items-start justify-between">
						<div className="space-y-1">
							<div className="flex items-center gap-2">
								<h3 className="font-medium text-foreground">
									Order #{order.orderNumber}
								</h3>
								<Badge
									variant={getStatusBadgeVariant(order.status)}
									className="text-xs"
								>
									{getStatusIcon(order.status)}
									<span className="ml-1">{order.status.replace(/_/g, ' ')}</span>
								</Badge>
							</div>
							<div className="text-sm text-muted-foreground">
								{order.purchaser?.profile?.firstName}{' '}
								{order.purchaser?.profile?.lastName} ({order.purchaser?.email})
								• Updated{' '}
								{format(new Date(order.statusUpdatedAt), 'MMM dd, yyyy HH:mm')}
							</div>
							{(order.outboundTrackingNumber || order.inboundTrackingNumber) && (
								<div className="text-xs text-muted-foreground">
									{order.outboundTrackingNumber && (
										<span>Outbound: {order.outboundTrackingNumber}</span>
									)}
									{order.outboundTrackingNumber &&
										order.inboundTrackingNumber && <span> • </span>}
									{order.inboundTrackingNumber && (
										<span>Inbound: {order.inboundTrackingNumber}</span>
									)}
								</div>
							)}
						</div>
					</div>

					<form onSubmit={handleUpdateOrder} className="space-y-3">
						<input type="hidden" name="orderId" value={order.id} />

						<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
							<div>
								<label className="text-xs font-medium text-muted-foreground">
									Status
								</label>
								<Select
									name="status"
									defaultValue={order.status}
									onValueChange={(value) => handleStatusChange(order.id, value)}
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
									defaultValue={order.notes || ''}
									className="mt-1 min-h-[38px] resize-none"
									rows={1}
								/>
							</div>
						</div>

						{/* Tracking Numbers */}
						{(selectedStatuses[order.id] === 'SHIPPED_TO_USER' ||
							order.status === 'SHIPPED_TO_USER' ||
							selectedStatuses[order.id] === 'DELIVERED_AWAITING_RETURN' ||
							order.status === 'DELIVERED_AWAITING_RETURN' ||
							selectedStatuses[order.id] === 'SHIPPED_TO_LAB' ||
							order.status === 'SHIPPED_TO_LAB' ||
							selectedStatuses[order.id] === 'RECEIVED_IN_PROCESS' ||
							order.status === 'RECEIVED_IN_PROCESS') &&
							selectedStatuses[order.id] !== 'COMPLETE_REPORT_DELIVERED' &&
							order.status !== 'COMPLETE_REPORT_DELIVERED' && (
								<div className="grid grid-cols-1 md:grid-cols-2 gap-3">
									<div>
										<label className="text-xs font-medium text-muted-foreground">
											Outbound Tracking
										</label>
										<Input
											name="outboundTrackingNumber"
											placeholder="Enter outbound tracking..."
											value={
												trackingNumbers[order.id]?.outbound ??
												order.outboundTrackingNumber ??
												''
											}
											onChange={(e) =>
												handleTrackingNumberChange(
													order.id,
													'outbound',
													e.target.value
												)
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
											value={
												trackingNumbers[order.id]?.inbound ??
												order.inboundTrackingNumber ??
												''
											}
											onChange={(e) =>
												handleTrackingNumberChange(
													order.id,
													'inbound',
													e.target.value
												)
											}
											className="mt-1"
										/>
									</div>
								</div>
							)}

						{/* Kit Reports */}
						<div className="border border-border rounded-lg overflow-hidden">
							<div className="bg-muted/50 px-3 py-2 border-b border-border">
								<span className="text-xs font-medium text-muted-foreground">
									Kit Reports
								</span>
							</div>
							<div className="divide-y divide-border">
								{order.kits.map((kit) => {
									const fileKey = `${order.id}-${kit.id}`;
									const selectedFile = reportFiles[fileKey];
									const hasExistingReport = !!kit.reportFileName;

									return (
										<div
											key={kit.id}
											className="flex items-center justify-between px-3 py-2"
										>
											<div className="flex items-center gap-3">
												<div className="flex items-center gap-2">
													<span className="text-sm font-medium text-foreground">
														Kit {kit.kitNumber}
													</span>
													<Badge variant="outline" className="text-xs">
														{kit.kitType}
													</Badge>
												</div>
												{kit.child && (
													<span className="text-sm text-muted-foreground">
														{kit.child.firstName || 'Unknown'}{' '}
														{kit.child.lastName || ''}
													</span>
												)}
											</div>

											<div className="flex items-center gap-2">
												{hasExistingReport && !selectedFile && (
													<Badge
														variant="default"
														className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
													>
														<FileIcon className="h-3 w-3 mr-1" />
														Uploaded
													</Badge>
												)}

												{selectedFile && (
													<span className="text-xs text-green-600 dark:text-green-400 max-w-[150px] truncate">
														{selectedFile.name}
													</span>
												)}

												{fileErrors[fileKey] && (
													<span className="text-xs text-destructive">
														{fileErrors[fileKey]}
													</span>
												)}

												<input
													type="file"
													name={`reportFile-${kit.id}`}
													accept=".pdf,.doc,.docx,.txt"
													onChange={(e) => {
														const file = e.target.files?.[0] || null;

														if (file) {
															const maxSize = 50 * 1024 * 1024;
															if (file.size > maxSize) {
																setFileErrors((prev) => ({
																	...prev,
																	[fileKey]: `File exceeds 50 MB`,
																}));
																setReportFiles((prev) => ({
																	...prev,
																	[fileKey]: null,
																}));
																e.target.value = '';
																return;
															}
															setFileErrors((prev) => {
																const newErrors = { ...prev };
																delete newErrors[fileKey];
																return newErrors;
															});
														}

														setReportFiles((prev) => ({
															...prev,
															[fileKey]: file,
														}));
													}}
													className="hidden"
													id={`file-${order.id}-${kit.id}`}
												/>
												<label
													htmlFor={`file-${order.id}-${kit.id}`}
													className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90 transition-colors"
												>
													<UploadIcon className="h-3.5 w-3.5" />
													{hasExistingReport || selectedFile
														? 'Replace'
														: 'Upload Report'}
												</label>
											</div>
										</div>
									);
								})}
							</div>
						</div>

						{/* Actions Row */}
						<div className="flex items-center justify-between pt-2 border-t border-border">
							<div className="flex items-center gap-2">
								<Button
									type="submit"
									size="sm"
									variant="outline"
									className="border-fore-blue text-fore-blue hover:bg-fore-blue/10"
									disabled={
										pendingOrders.has(order.id) ||
										isUpdateDisabled(
											order,
											selectedStatuses[order.id] || order.status
										)
									}
								>
									{pendingOrders.has(order.id) ? (
										<>
											<Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
											Saving...
										</>
									) : (
										'Save Changes'
									)}
								</Button>
								{(() => {
									const message = getValidationMessage(
										order,
										selectedStatuses[order.id] || order.status
									);
									return (
										message && (
											<p className="text-xs text-amber-600 dark:text-amber-400">
												{message}
											</p>
										)
									);
								})()}
							</div>

							<ConfirmDialog
								title="Delete Order?"
								description={`Are you sure you want to delete Order #${order.orderNumber}? This action cannot be undone.`}
								onConfirm={() => handleDeleteOrder(order.id)}
							>
								<Button
									type="button"
									size="sm"
									variant="outline"
									className="text-destructive border-destructive hover:text-destructive hover:bg-destructive/10"
								>
									Delete
								</Button>
							</ConfirmDialog>
						</div>
					</form>
				</div>
			))}
		</div>
	);
}
