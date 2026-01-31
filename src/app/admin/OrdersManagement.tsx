'use client';

import { Badge } from '@/components/ui/badge';
import {
	PackageIcon,
	ClockIcon,
	CheckCircleIcon,
	ChevronRightIcon,
	TruckIcon,
} from 'lucide-react';
import { dateFormats } from '@/lib/utils';
import Link from 'next/link';

interface Kit {
	id: string;
	kitNumber: number;
	kitType: string;
}

interface Order {
	id: string;
	orderNumber: string;
	status: string;
	statusUpdatedAt: Date;
	createdAt: Date;
	kits: Kit[];
	parent?: {
		email: string;
		profile?: {
			firstName: string;
			lastName: string;
		} | null;
	} | null;
	purchaser: {
		email: string;
		profile?: {
			firstName: string;
			lastName: string;
		} | null;
	};
}

interface OrdersManagementProps {
	orders: Order[];
}

function getStatusBadgeVariant(status: string) {
	switch (status) {
		case 'ORDER_RECEIVED':
		case 'ONBOARDING_COMPLETED':
			return 'secondary';
		case 'PREPARING_ORDER':
		case 'RECEIVED_IN_PROCESS':
			return 'default';
		case 'SHIPPED_TO_USER':
		case 'DELIVERED_AWAITING_RETURN':
		case 'SHIPPED_TO_LAB':
			return 'outline';
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
			return <PackageIcon className="h-3 w-3" />;
		case 'ONBOARDING_COMPLETED':
		case 'COMPLETE_REPORT_DELIVERED':
		case 'COMPLETE_COUNSELING_REQUIRED':
			return <CheckCircleIcon className="h-3 w-3" />;
		case 'SHIPPED_TO_USER':
		case 'SHIPPED_TO_LAB':
			return <TruckIcon className="h-3 w-3" />;
		case 'DELIVERED_AWAITING_RETURN':
		case 'RECEIVED_IN_PROCESS':
			return <ClockIcon className="h-3 w-3" />;
		default:
			return <PackageIcon className="h-3 w-3" />;
	}
}

export function OrdersManagement({ orders }: OrdersManagementProps) {
	if (orders.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg">
				<PackageIcon className="h-10 w-10 text-muted-foreground mb-3" />
				<h2 className="text-base font-medium text-foreground mb-1">
					No orders found
				</h2>
				<p className="text-sm text-muted-foreground">
					No orders match the current criteria.
				</p>
			</div>
		);
	}

	return (
		<div className="border border-border rounded-lg divide-y divide-border">
			{orders.map((order) => {
				const totalKits = order.kits.length;

				return (
				<Link
					key={order.id}
					href={`/admin/orders/${order.id}`}
					className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
				>
					<div className="flex items-center gap-4 min-w-0">
						{/* Order Number & Status */}
						<div className="min-w-[180px]">
							<div className="flex items-center gap-2">
								<span className="font-medium text-foreground">
									#{order.orderNumber}
								</span>
								<Badge
									variant={getStatusBadgeVariant(order.status)}
									className="text-xs gap-1"
								>
									{getStatusIcon(order.status)}
									{order.status.replace(/_/g, ' ')}
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground mt-0.5">
								{dateFormats.short(new Date(order.createdAt))}
							</p>
						</div>

						{/* Customer */}
						<div className="min-w-[200px]">
							<p className="text-sm text-foreground truncate">
								{order.purchaser.profile?.firstName}{' '}
								{order.purchaser.profile?.lastName}
							</p>
							<p className="text-xs text-muted-foreground truncate">
								{order.purchaser.email}
							</p>
						</div>
					</div>

					<div className="flex items-center gap-4">
						{/* Kits Summary */}
						<div className="hidden md:block text-right">
							<p className="text-sm text-foreground">
								{totalKits} kit{totalKits !== 1 ? 's' : ''}
							</p>
						</div>

						<ChevronRightIcon className="h-5 w-5 text-muted-foreground flex-shrink-0" />
					</div>
				</Link>
				);
			})}
		</div>
	);
}
