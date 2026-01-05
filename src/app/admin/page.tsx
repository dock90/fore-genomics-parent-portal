import { prisma } from '@/lib/prisma';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
	PackageIcon,
	CheckCircleIcon,
	ClockIcon,
	ActivityIcon,
	TrendingUpIcon,
} from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

export default async function AdminDashboard() {
	// Fetch key metrics
	const totalOrders = await prisma.order.count();
	const completedOrders = await prisma.order.count({
		where: { status: 'COMPLETE_REPORT_DELIVERED' },
	});
	const pendingOrders = await prisma.order.count({
		where: {
			status: {
				in: [
					'ORDER_RECEIVED',
					'ONBOARDING_COMPLETED',
					'PREPARING_ORDER',
					'SHIPPED_TO_USER',
					'DELIVERED_AWAITING_RETURN',
					'SHIPPED_TO_LAB',
					'RECEIVED_IN_PROCESS',
				] as any,
			},
		},
	});

	// Fetch recent orders
	const recentOrders = await prisma.order.findMany({
		take: 5,
		include: {
			parent: {
				include: {
					profile: true,
				},
			},
			purchaser: {
				include: {
					profile: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	});

	// Fetch recent audit logs
	const recentAuditLogs = await prisma.auditLog.findMany({
		take: 10,
		include: {
			order: {
				select: {
					orderNumber: true,
				},
			},
		},
		orderBy: {
			createdAt: 'desc',
		},
	});

	const metrics = [
		{
			title: 'Total Orders',
			value: totalOrders,
			icon: PackageIcon,
			description: 'All orders',
			color: 'text-fore-blue',
			bgColor: 'bg-fore-blue/10',
		},
		{
			title: 'Completed',
			value: completedOrders,
			icon: CheckCircleIcon,
			description: 'Reports delivered',
			color: 'text-fore-teal',
			bgColor: 'bg-fore-teal/10',
		},
		{
			title: 'Pending',
			value: pendingOrders,
			icon: ClockIcon,
			description: 'In progress',
			color: 'text-amber-600',
			bgColor: 'bg-amber-50',
		},
	];

	const getStatusBadgeVariant = (status: string) => {
		switch (status) {
			case 'COMPLETE_REPORT_DELIVERED':
				return 'default';
			case 'RECEIVED_IN_PROCESS':
				return 'secondary';
			case 'SHIPPED_TO_LAB':
				return 'outline';
			case 'DELIVERED_AWAITING_RETURN':
				return 'outline';
			case 'SHIPPED_TO_USER':
				return 'outline';
			case 'PREPARING_ORDER':
				return 'secondary';
			case 'ONBOARDING_COMPLETED':
				return 'secondary';
			default:
				return 'secondary';
		}
	};

	const getActionIcon = (action: string) => {
		switch (action) {
			case 'REPORT_UPLOAD':
				return <TrendingUpIcon className="h-4 w-4" />;
			case 'REPORT_DOWNLOAD':
				return <ActivityIcon className="h-4 w-4" />;
			default:
				return <ActivityIcon className="h-4 w-4" />;
		}
	};

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold text-foreground">Overview</h1>
				<p className="text-muted-foreground mt-1">
					System activity and key metrics
				</p>
			</div>

			{/* Metrics Grid */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				{metrics.map((metric) => (
					<div
						key={metric.title}
						className="flex items-center justify-between p-4 border border-border rounded-lg bg-card"
					>
						<div>
							<p className="text-sm font-medium text-muted-foreground">
								{metric.title}
							</p>
							<p className="text-2xl font-semibold text-foreground mt-1">
								{metric.value}
							</p>
							<p className="text-xs text-muted-foreground mt-0.5">
								{metric.description}
							</p>
						</div>
						<div className={`p-2.5 rounded-lg ${metric.bgColor}`}>
							<metric.icon className={`h-5 w-5 ${metric.color}`} />
						</div>
					</div>
				))}
			</div>

			{/* Recent Activity */}
			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Recent Orders */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-medium text-foreground">
							Recent Orders
						</h2>
						<Link href="/admin/orders">
							<Button variant="ghost" size="sm" className="text-xs h-7">
								View all
							</Button>
						</Link>
					</div>
					<div className="border border-border rounded-lg divide-y divide-border">
						{recentOrders.map((order) => (
							<div
								key={order.id}
								className="flex items-center justify-between p-3"
							>
								<div>
									<p className="text-sm font-medium text-foreground">
										Order {order.orderNumber}
									</p>
									<p className="text-xs text-muted-foreground">
										{order.parent?.profile?.firstName}{' '}
										{order.parent?.profile?.lastName} •{' '}
										{format(new Date(order.createdAt), 'MMM dd, yyyy')}
									</p>
								</div>
								<Badge
									variant={getStatusBadgeVariant(order.status)}
									className="text-xs"
								>
									{order.status.replace(/_/g, ' ')}
								</Badge>
							</div>
						))}
					</div>
				</div>

				{/* Recent Activity */}
				<div className="space-y-3">
					<div className="flex items-center justify-between">
						<h2 className="text-sm font-medium text-foreground">
							Recent Activity
						</h2>
						<Link href="/admin/audit-logs">
							<Button variant="ghost" size="sm" className="text-xs h-7">
								View all
							</Button>
						</Link>
					</div>
					<div className="border border-border rounded-lg divide-y divide-border">
						{recentAuditLogs.map((log) => (
							<div key={log.id} className="flex items-center gap-3 p-3">
								<div className="flex-shrink-0 text-muted-foreground">
									{getActionIcon(log.action)}
								</div>
								<div className="flex-1 min-w-0">
									<p className="text-sm font-medium text-foreground">
										{log.action.replace('_', ' ')}
									</p>
									<p className="text-xs text-muted-foreground">
										Order {log.order.orderNumber} • {log.userEmail} •{' '}
										{format(new Date(log.createdAt), 'MMM dd, HH:mm')}
									</p>
								</div>
							</div>
						))}
					</div>
				</div>
			</div>
		</div>
	);
}
