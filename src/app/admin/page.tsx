import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import {
	AlertTriangleIcon,
	ClockIcon,
	UsersIcon,
	ArrowRightIcon,
	PackageIcon,
} from 'lucide-react';
import Link from 'next/link';
import { subDays } from '@/lib/utils';

// Configurable thresholds (in days)
const ONBOARDING_INCOMPLETE_THRESHOLD_DAYS = parseInt(
	process.env.ONBOARDING_INCOMPLETE_THRESHOLD_DAYS || '7',
	10
);
const KITS_AWAITING_RETURN_THRESHOLD_DAYS = parseInt(
	process.env.KITS_AWAITING_RETURN_THRESHOLD_DAYS || '14',
	10
);

export default async function AdminOverview() {
	// Calculate threshold dates
	const onboardingThresholdDate = subDays(
		new Date(),
		ONBOARDING_INCOMPLETE_THRESHOLD_DAYS
	);
	const awaitingReturnThresholdDate = subDays(
		new Date(),
		KITS_AWAITING_RETURN_THRESHOLD_DAYS
	);

	// Fetch orders with incomplete onboarding (ORDER_RECEIVED for > X days)
	const onboardingIncompleteOrders = await prisma.order.count({
		where: {
			status: 'ORDER_RECEIVED',
			createdAt: {
				lt: onboardingThresholdDate,
			},
		},
	});

	// Fetch orders awaiting kit return (DELIVERED_AWAITING_RETURN for > Y days)
	const kitsAwaitingReturnOrders = await prisma.order.count({
		where: {
			status: 'DELIVERED_AWAITING_RETURN',
			statusUpdatedAt: {
				lt: awaitingReturnThresholdDate,
			},
		},
	});

	// Simple stats
	const totalUsers = await prisma.user.count();

	const alerts = [
		{
			id: 'onboarding-incomplete',
			title: 'Onboarding Incomplete',
			count: onboardingIncompleteOrders,
			description: `Orders created over ${ONBOARDING_INCOMPLETE_THRESHOLD_DAYS} days ago still waiting for onboarding`,
			href: '/admin/orders?filter=onboarding-incomplete',
			icon: ClockIcon,
			color: 'text-amber-600',
			bgColor: 'bg-amber-50 dark:bg-amber-950/30',
			borderColor: 'border-amber-200 dark:border-amber-800',
		},
		{
			id: 'kits-awaiting-return',
			title: 'Kits Awaiting Return',
			count: kitsAwaitingReturnOrders,
			description: `Kits delivered over ${KITS_AWAITING_RETURN_THRESHOLD_DAYS} days ago not yet returned`,
			href: '/admin/orders?filter=kits-awaiting-return',
			icon: PackageIcon,
			color: 'text-orange-600',
			bgColor: 'bg-orange-50 dark:bg-orange-950/30',
			borderColor: 'border-orange-200 dark:border-orange-800',
		},
	];

	const hasAlerts = alerts.some((alert) => alert.count > 0);

	return (
		<div className="space-y-8">
			{/* Header */}
			<div>
				<h1 className="text-2xl font-semibold text-foreground">Overview</h1>
				<p className="text-muted-foreground mt-1">
					Action items and system summary
				</p>
			</div>

			{/* Action Required Alerts */}
			<div className="space-y-4">
				<h2 className="text-sm font-medium text-foreground flex items-center gap-2">
					<AlertTriangleIcon className="h-4 w-4 text-muted-foreground" />
					Action Required
				</h2>

				{hasAlerts ? (
					<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
						{alerts.map((alert) => (
							<div
								key={alert.id}
								className={`relative p-4 rounded-lg border ${alert.borderColor} ${alert.bgColor}`}
							>
								<div className="flex items-start justify-between">
									<div className="flex items-start gap-3">
										<div
											className={`p-2 rounded-lg bg-white dark:bg-background`}
										>
											<alert.icon className={`h-5 w-5 ${alert.color}`} />
										</div>
										<div>
											<h3 className="font-medium text-foreground">
												{alert.title}
											</h3>
											<p className="text-sm text-muted-foreground mt-0.5">
												{alert.description}
											</p>
										</div>
									</div>
									<span className={`text-2xl font-bold ${alert.color}`}>
										{alert.count}
									</span>
								</div>

								{alert.count > 0 && (
									<Link href={alert.href} className="mt-3 block">
										<Button
											variant="outline"
											size="sm"
											className="w-full justify-center gap-2"
										>
											View Orders
											<ArrowRightIcon className="h-3 w-3" />
										</Button>
									</Link>
								)}
							</div>
						))}
					</div>
				) : (
					<div className="p-6 rounded-lg border border-border bg-muted/30 text-center">
						<p className="text-sm text-muted-foreground">
							No action items at this time
						</p>
					</div>
				)}
			</div>

			{/* Simple Stats */}
			<div className="space-y-4">
				<h2 className="text-sm font-medium text-foreground">Quick Stats</h2>

				<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
					<Link
						href="/admin/users"
						className="flex items-center justify-between p-4 border border-border rounded-lg bg-card hover:bg-muted/50 transition-colors group"
					>
						<div className="flex items-center gap-3">
							<div className="p-2.5 rounded-lg bg-fore-blue/10">
								<UsersIcon className="h-5 w-5 text-fore-blue" />
							</div>
							<div>
								<p className="text-sm font-medium text-muted-foreground">
									Total Users
								</p>
								<p className="text-2xl font-semibold text-foreground">
									{totalUsers}
								</p>
							</div>
						</div>
						<ArrowRightIcon className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-colors" />
					</Link>
				</div>
			</div>
		</div>
	);
}
