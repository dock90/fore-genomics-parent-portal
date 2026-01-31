import { prisma } from '@/lib/prisma';
import { OrdersManagement } from '../OrdersManagement';
import { CreateOrderModal } from './CreateOrderModal';
import { subDays } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { XIcon } from 'lucide-react';
import Link from 'next/link';

// Configurable thresholds (in days)
const ONBOARDING_INCOMPLETE_THRESHOLD_DAYS = parseInt(
	process.env.ONBOARDING_INCOMPLETE_THRESHOLD_DAYS || '7',
	10
);
const KITS_AWAITING_RETURN_THRESHOLD_DAYS = parseInt(
	process.env.KITS_AWAITING_RETURN_THRESHOLD_DAYS || '14',
	10
);

interface OrdersPageProps {
	searchParams: { filter?: string };
}

export default async function OrdersPage({ searchParams }: OrdersPageProps) {
	const filter = searchParams.filter;

	// Calculate threshold dates
	const onboardingThresholdDate = subDays(
		new Date(),
		ONBOARDING_INCOMPLETE_THRESHOLD_DAYS
	);
	const awaitingReturnThresholdDate = subDays(
		new Date(),
		KITS_AWAITING_RETURN_THRESHOLD_DAYS
	);

	// Build where clause based on filter
	let whereClause: any = {};
	let filterLabel = '';

	if (filter === 'onboarding-incomplete') {
		whereClause = {
			status: 'ORDER_RECEIVED',
			createdAt: {
				lt: onboardingThresholdDate,
			},
		};
		filterLabel = `Onboarding Incomplete (>${ONBOARDING_INCOMPLETE_THRESHOLD_DAYS} days)`;
	} else if (filter === 'kits-awaiting-return') {
		whereClause = {
			status: 'DELIVERED_AWAITING_RETURN',
			statusUpdatedAt: {
				lt: awaitingReturnThresholdDate,
			},
		};
		filterLabel = `Kits Awaiting Return (>${KITS_AWAITING_RETURN_THRESHOLD_DAYS} days)`;
	}

	// Fetch orders with minimal data for list view
	const orders = await prisma.order.findMany({
		where: whereClause,
		include: {
			parent: {
				select: {
					email: true,
					profile: {
						select: {
							firstName: true,
							lastName: true,
						},
					},
				},
			},
			purchaser: {
				select: {
					email: true,
					profile: {
						select: {
							firstName: true,
							lastName: true,
						},
					},
				},
			},
			kits: {
				select: {
					id: true,
					kitNumber: true,
					kitType: true,
				},
				orderBy: {
					kitNumber: 'asc',
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	});

	// Fetch all users for the modal
	const users = await prisma.user.findMany({
		include: {
			profile: true,
		},
		orderBy: {
			email: 'asc',
		},
	});

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Orders</h1>
					<p className="text-muted-foreground mt-1">
						{filter ? `${orders.length} orders` : 'Manage orders and track status'}
					</p>
				</div>
				<CreateOrderModal users={users} />
			</div>

			{/* Active Filter */}
			{filter && filterLabel && (
				<div className="flex items-center gap-2">
					<span className="text-sm text-muted-foreground">Filtered by:</span>
					<Badge variant="secondary" className="inline-flex items-center gap-1.5 pr-1.5">
						<span>{filterLabel}</span>
						<Link
							href="/admin/orders"
							className="inline-flex items-center justify-center rounded-full p-0.5 hover:bg-muted-foreground/20 transition-colors"
						>
							<XIcon className="h-3 w-3" />
						</Link>
					</Badge>
				</div>
			)}

			{/* Orders List */}
			<OrdersManagement orders={orders} />
		</div>
	);
}
