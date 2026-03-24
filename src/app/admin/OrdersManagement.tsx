'use client';

import { useMemo, useCallback, useState, useEffect } from 'react';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from '@/components/ui/select';
import {
	PackageIcon,
	ClockIcon,
	CheckCircleIcon,
	ChevronRightIcon,
	TruckIcon,
	SearchIcon,
	XIcon,
} from 'lucide-react';
import { dateFormats } from '@/lib/utils';
import Link from 'next/link';

const ORDER_STATUSES = [
	{ value: 'all', label: 'All Statuses' },
	{ value: 'ORDER_RECEIVED', label: 'Order Received' },
	{ value: 'ONBOARDING_COMPLETED', label: 'Onboarding Completed' },
	{ value: 'PREPARING_ORDER', label: 'Preparing Order' },
	{ value: 'SHIPPED_TO_USER', label: 'Shipped to User' },
	{ value: 'DELIVERED_AWAITING_RETURN', label: 'Awaiting Return' },
	{ value: 'SHIPPED_TO_LAB', label: 'Shipped to Lab' },
	{ value: 'RECEIVED_IN_PROCESS', label: 'In Process' },
	{ value: 'COMPLETE_REPORT_DELIVERED', label: 'Report Delivered' },
	{ value: 'COMPLETE_COUNSELING_REQUIRED', label: 'Counseling Required' },
	{ value: 'COMPLETE_NO_COUNSELING_REQUIRED', label: 'No Counseling Required' },
];

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
			return <PackageIcon className="h-3 w-3" />;
		case 'ONBOARDING_COMPLETED':
		case 'COMPLETE_REPORT_DELIVERED':
		case 'COMPLETE_COUNSELING_REQUIRED':
		case 'COMPLETE_NO_COUNSELING_REQUIRED':
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
	const searchParams = useSearchParams();
	const router = useRouter();
	const pathname = usePathname();

	// Read filters from URL
	const searchParam = searchParams.get('search') || '';
	const statusFilter = searchParams.get('status') || 'all';

	// Local state for search input (for responsive typing)
	const [searchInput, setSearchInput] = useState(searchParam);

	// Sync local state when URL changes externally
	useEffect(() => {
		setSearchInput(searchParam);
	}, [searchParam]);

	// Debounce URL update for search
	useEffect(() => {
		const timer = setTimeout(() => {
			if (searchInput !== searchParam) {
				updateSearchParam(searchInput);
			}
		}, 300);

		return () => clearTimeout(timer);
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [searchInput]);

	// Update URL params
	const updateSearchParam = useCallback(
		(value: string) => {
			const params = new URLSearchParams(searchParams.toString());

			if (value) {
				params.set('search', value);
			} else {
				params.delete('search');
			}

			const queryString = params.toString();
			router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, {
				scroll: false,
			});
		},
		[searchParams, router, pathname]
	);

	const setStatusFilter = useCallback(
		(value: string) => {
			const params = new URLSearchParams(searchParams.toString());

			if (value && value !== 'all') {
				params.set('status', value);
			} else {
				params.delete('status');
			}

			const queryString = params.toString();
			router.replace(`${pathname}${queryString ? `?${queryString}` : ''}`, {
				scroll: false,
			});
		},
		[searchParams, router, pathname]
	);

	// Use local search for filtering (immediate feedback)
	const search = searchInput;

	// Filter orders based on search and status
	const filteredOrders = useMemo(() => {
		return orders.filter((order) => {
			// Status filter
			if (statusFilter !== 'all' && order.status !== statusFilter) {
				return false;
			}

			// Search filter (name, email, or order number)
			if (search.trim()) {
				const searchLower = search.toLowerCase().trim();
				const firstName = order.purchaser.profile?.firstName?.toLowerCase() || '';
				const lastName = order.purchaser.profile?.lastName?.toLowerCase() || '';
				const fullName = `${firstName} ${lastName}`;
				const email = order.purchaser.email.toLowerCase();
				const orderNumber = order.orderNumber.toLowerCase();

				// Also check parent if different from purchaser
				const parentFirstName = order.parent?.profile?.firstName?.toLowerCase() || '';
				const parentLastName = order.parent?.profile?.lastName?.toLowerCase() || '';
				const parentFullName = `${parentFirstName} ${parentLastName}`;
				const parentEmail = order.parent?.email?.toLowerCase() || '';

				const matchesPurchaser =
					firstName.includes(searchLower) ||
					lastName.includes(searchLower) ||
					fullName.includes(searchLower) ||
					email.includes(searchLower);

				const matchesParent =
					parentFirstName.includes(searchLower) ||
					parentLastName.includes(searchLower) ||
					parentFullName.includes(searchLower) ||
					parentEmail.includes(searchLower);

				const matchesOrder = orderNumber.includes(searchLower);

				if (!matchesPurchaser && !matchesParent && !matchesOrder) {
					return false;
				}
			}

			return true;
		});
	}, [orders, search, statusFilter]);

	const hasFilters = searchInput.trim() || statusFilter !== 'all';

	const clearFilters = () => {
		setSearchInput('');
		router.replace(pathname, { scroll: false });
	};

	return (
		<div className="space-y-4">
			{/* Search & Filter Toolbar */}
			<div className="flex flex-col sm:flex-row gap-3">
				{/* Search Input */}
				<div className="relative flex-1">
					<SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by name, email, or order #..."
						value={searchInput}
						onChange={(e) => setSearchInput(e.target.value)}
						className="pl-9 pr-9"
					/>
					{searchInput && (
						<button
							onClick={() => setSearchInput('')}
							className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
						>
							<XIcon className="h-4 w-4" />
						</button>
					)}
				</div>

				{/* Status Filter */}
				<Select value={statusFilter} onValueChange={setStatusFilter}>
					<SelectTrigger className="w-full sm:w-[200px]">
						<SelectValue placeholder="Filter by status" />
					</SelectTrigger>
					<SelectContent>
						{ORDER_STATUSES.map((status) => (
							<SelectItem key={status.value} value={status.value}>
								{status.label}
							</SelectItem>
						))}
					</SelectContent>
				</Select>
			</div>

			{/* Results Count & Clear */}
			{hasFilters && (
				<div className="flex items-center justify-between text-sm">
					<span className="text-muted-foreground">
						{filteredOrders.length} of {orders.length} orders
					</span>
				<button
					onClick={clearFilters}
					className="px-3 py-1.5 text-sm font-medium text-fore-blue bg-fore-blue/10 hover:bg-fore-blue/20 rounded-md transition-colors"
				>
					Clear filters
				</button>
				</div>
			)}

			{/* Orders List */}
			{filteredOrders.length === 0 ? (
				<div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg">
					<PackageIcon className="h-10 w-10 text-muted-foreground mb-3" />
					<h2 className="text-base font-medium text-foreground mb-1">
						No orders found
					</h2>
					<p className="text-sm text-muted-foreground">
						{hasFilters
							? 'Try adjusting your search or filters.'
							: 'No orders match the current criteria.'}
					</p>
				</div>
			) : (
				<div className="border border-border rounded-lg divide-y divide-border">
					{filteredOrders.map((order) => {
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
			)}
		</div>
	);
}
