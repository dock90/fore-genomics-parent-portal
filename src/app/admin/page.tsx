import { prisma } from '@/lib/prisma';
import { Button } from '@/components/ui/button';
import {
	ClockIcon,
	UsersIcon,
	ArrowRightIcon,
	PackageIcon,
	CalendarClockIcon,
	CheckCircle2Icon,
	XCircleIcon,
	ActivityIcon,
	CircleCheckBigIcon,
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

// Pipeline stages grouped into phases for a glanceable funnel
const PHASES: {
	name: string;
	dotClass: string;
	barClass: string;
	stages: { status: string; label: string }[];
}[] = [
	{
		name: 'Onboarding',
		dotClass: 'bg-fore-teal-light',
		barClass: 'bg-fore-teal-light',
		stages: [
			{ status: 'ORDER_RECEIVED', label: 'Order Received' },
			{ status: 'ONBOARDING_COMPLETED', label: 'Onboarding Completed' },
		],
	},
	{
		name: 'Shipping',
		dotClass: 'bg-fore-teal',
		barClass: 'bg-fore-teal',
		stages: [
			{ status: 'PREPARING_ORDER', label: 'Preparing Order' },
			{ status: 'SHIPPED_TO_USER', label: 'Shipped to User' },
			{ status: 'DELIVERED_AWAITING_RETURN', label: 'Delivered / Awaiting Return' },
		],
	},
	{
		name: 'Lab',
		dotClass: 'bg-fore-blue',
		barClass: 'bg-fore-blue',
		stages: [
			{ status: 'SHIPPED_TO_LAB', label: 'Shipped to Lab' },
			{ status: 'RECEIVED_IN_PROCESS', label: 'Received / In Process' },
		],
	},
	{
		name: 'Complete',
		dotClass: 'bg-teal-800',
		barClass: 'bg-teal-800',
		stages: [
			{ status: 'COMPLETE_REPORT_DELIVERED', label: 'Report Delivered' },
			{ status: 'COMPLETE_COUNSELING_REQUIRED', label: 'Counseling Required' },
			{ status: 'COMPLETE_NO_COUNSELING_REQUIRED', label: 'No Counseling Needed' },
		],
	},
];

const CANCELED_STATUS = 'ORDER_CANCELED';

function SectionHeading({ children }: { children: React.ReactNode }) {
	return (
		<h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
			{children}
		</h2>
	);
}

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

	const [
		onboardingIncompleteOrders,
		kitsAwaitingReturnOrders,
		totalUsers,
		statusCounts,
	] = await Promise.all([
		// Orders with incomplete onboarding (ORDER_RECEIVED for > X days)
		prisma.order.count({
			where: {
				status: 'ORDER_RECEIVED',
				createdAt: { lt: onboardingThresholdDate },
			},
		}),
		// Orders awaiting kit return (DELIVERED_AWAITING_RETURN for > Y days)
		prisma.order.count({
			where: {
				status: 'DELIVERED_AWAITING_RETURN',
				statusUpdatedAt: { lt: awaitingReturnThresholdDate },
			},
		}),
		prisma.user.count(),
		// Orders grouped by pipeline stage
		prisma.order.groupBy({ by: ['status'], _count: { _all: true } }),
	]);

	const countByStatus: Record<string, number> = {};
	for (const row of statusCounts) {
		countByStatus[row.status] = row._count._all;
	}

	const totalOrders = Object.values(countByStatus).reduce((a, b) => a + b, 0);
	const canceledCount = countByStatus[CANCELED_STATUS] ?? 0;
	const counselingRequired = countByStatus['COMPLETE_COUNSELING_REQUIRED'] ?? 0;

	const phaseTotals = PHASES.map((phase) =>
		phase.stages.reduce((sum, s) => sum + (countByStatus[s.status] ?? 0), 0)
	);
	const completedCount = phaseTotals[PHASES.length - 1];
	const activeCount = totalOrders - completedCount - canceledCount;

	// Stages that currently need admin attention (drives the amber dots in the pipeline)
	const attentionByStatus: Record<string, string> = {};
	if (onboardingIncompleteOrders > 0) {
		attentionByStatus['ORDER_RECEIVED'] =
			`${onboardingIncompleteOrders} overdue for onboarding`;
	}
	if (kitsAwaitingReturnOrders > 0) {
		attentionByStatus['DELIVERED_AWAITING_RETURN'] =
			`${kitsAwaitingReturnOrders} overdue for return`;
	}
	if (counselingRequired > 0) {
		attentionByStatus['COMPLETE_COUNSELING_REQUIRED'] =
			`${counselingRequired} awaiting counseling`;
	}

	const alerts = [
		{
			id: 'onboarding-incomplete',
			title: 'Onboarding Incomplete',
			count: onboardingIncompleteOrders,
			description: `Orders older than ${ONBOARDING_INCOMPLETE_THRESHOLD_DAYS} days still waiting on onboarding`,
			href: '/admin/orders?filter=onboarding-incomplete',
			cta: 'View orders',
			icon: ClockIcon,
			color: 'text-amber-600',
			iconBg: 'bg-amber-100',
			accentColor: 'border-l-amber-500',
		},
		{
			id: 'kits-awaiting-return',
			title: 'Kits Awaiting Return',
			count: kitsAwaitingReturnOrders,
			description: `Kits delivered over ${KITS_AWAITING_RETURN_THRESHOLD_DAYS} days ago, not yet returned`,
			href: '/admin/orders?filter=kits-awaiting-return',
			cta: 'View orders',
			icon: PackageIcon,
			color: 'text-orange-600',
			iconBg: 'bg-orange-100',
			accentColor: 'border-l-orange-500',
		},
		{
			id: 'counseling-required',
			title: 'Counseling Required',
			count: counselingRequired,
			description: 'Completed reports that need a genetic counseling session',
			href: `/admin/orders?status=COMPLETE_COUNSELING_REQUIRED`,
			cta: 'View orders',
			icon: CalendarClockIcon,
			color: 'text-fore-blue',
			iconBg: 'bg-secondary',
			accentColor: 'border-l-fore-teal',
		},
	];

	const openAlerts = alerts.filter((alert) => alert.count > 0);

	const stats = [
		{
			label: 'Total Orders',
			value: totalOrders,
			href: '/admin/orders',
			icon: PackageIcon,
		},
		{
			label: 'Active',
			value: activeCount,
			href: '/admin/orders',
			icon: ActivityIcon,
		},
		{
			label: 'Completed',
			value: completedCount,
			href: '/admin/orders',
			icon: CheckCircle2Icon,
		},
		{
			label: 'Canceled',
			value: canceledCount,
			href: `/admin/orders?status=${CANCELED_STATUS}`,
			icon: XCircleIcon,
		},
		{
			label: 'Total Users',
			value: totalUsers,
			href: '/admin/users',
			icon: UsersIcon,
		},
	];

	return (
		<div className="mx-auto max-w-6xl space-y-10">
			{/* Header */}
			<div className="flex flex-wrap items-end justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold text-foreground">Overview</h1>
					<p className="mt-1 text-muted-foreground">
						What needs your attention across the order pipeline
					</p>
				</div>
				<p className="text-sm text-muted-foreground">
					{new Date().toLocaleDateString('en-US', {
						weekday: 'long',
						month: 'long',
						day: 'numeric',
					})}
				</p>
			</div>

			{/* Action Required */}
			<section className="space-y-4">
				<div className="flex items-center gap-2">
					<SectionHeading>Action Required</SectionHeading>
					{openAlerts.length > 0 && (
						<span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-amber-500 px-1.5 text-xs font-bold text-white tabular-nums">
							{openAlerts.reduce((sum, a) => sum + a.count, 0)}
						</span>
					)}
				</div>

				{openAlerts.length > 0 ? (
					<div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
						{openAlerts.map((alert) => (
							<div
								key={alert.id}
								className={`flex h-full flex-col rounded-xl border border-border border-l-4 bg-card p-5 shadow-sm ${alert.accentColor}`}
							>
								<div className="flex items-start justify-between gap-4">
									<div className={`rounded-xl p-2.5 ${alert.iconBg}`}>
										<alert.icon className={`h-5 w-5 ${alert.color}`} />
									</div>
									<span
										className={`text-3xl font-bold tabular-nums ${alert.color}`}
									>
										{alert.count}
									</span>
								</div>
								<h3 className="mt-4 font-semibold text-foreground">
									{alert.title}
								</h3>
								<p className="mt-1 text-sm text-muted-foreground">
									{alert.description}
								</p>
								<Link href={alert.href} className="mt-auto block pt-4">
									<Button
										variant="outline"
										size="sm"
										className="w-full justify-center gap-2"
									>
										{alert.cta}
										<ArrowRightIcon className="h-3 w-3" />
									</Button>
								</Link>
							</div>
						))}
					</div>
				) : (
					<div className="flex items-center gap-3 rounded-xl border border-border bg-secondary/50 p-5">
						<CircleCheckBigIcon className="h-5 w-5 text-fore-blue" />
						<p className="text-sm font-medium text-foreground">
							All clear — no action items right now
						</p>
					</div>
				)}
			</section>

			{/* Order Pipeline */}
			<section className="space-y-4">
				<div className="flex flex-wrap items-center justify-between gap-2">
					<SectionHeading>
						Order Pipeline{' '}
						<span className="font-normal normal-case tracking-normal">
							· {activeCount} active of {totalOrders} total
						</span>
					</SectionHeading>
					<div className="flex flex-wrap items-center gap-x-4 gap-y-1">
						{PHASES.map((phase, i) => (
							<span
								key={phase.name}
								className="flex items-center gap-1.5 text-xs text-muted-foreground"
							>
								<span className={`h-2 w-2 rounded-full ${phase.dotClass}`} />
								{phase.name}
								<span className="font-semibold text-foreground tabular-nums">
									{phaseTotals[i]}
								</span>
							</span>
						))}
					</div>
				</div>

				{/* Distribution bar */}
				<div className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted">
					{totalOrders > 0 &&
						PHASES.map(
							(phase, i) =>
								phaseTotals[i] > 0 && (
									<div
										key={phase.name}
										className={phase.barClass}
										style={{ width: `${(phaseTotals[i] / totalOrders) * 100}%` }}
										title={`${phase.name}: ${phaseTotals[i]}`}
									/>
								)
						)}
				</div>

				{/* Phase columns */}
				<div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
					{PHASES.map((phase, i) => (
						<div
							key={phase.name}
							className="flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-sm"
						>
							<div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-3">
								<span className="flex items-center gap-2 text-sm font-semibold text-foreground">
									<span className={`h-2 w-2 rounded-full ${phase.dotClass}`} />
									{phase.name}
								</span>
								<span className="text-sm font-bold text-foreground tabular-nums">
									{phaseTotals[i]}
								</span>
							</div>
							<div className="flex-1 space-y-0.5 p-2">
								{phase.stages.map((stage) => {
									const count = countByStatus[stage.status] ?? 0;
									const attention = attentionByStatus[stage.status];
									return (
										<Link
											key={stage.status}
											href={`/admin/orders?status=${stage.status}`}
											title={attention ?? stage.label}
											className="flex items-center justify-between gap-2 rounded-lg px-3 py-2.5 transition-colors hover:bg-muted/60"
										>
											<span className="flex items-center gap-2 text-sm text-muted-foreground">
												{attention && (
													<span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
												)}
												{stage.label}
											</span>
											<span
												className={`text-sm tabular-nums ${
													count > 0
														? 'font-semibold text-foreground'
														: 'text-muted-foreground/50'
												}`}
											>
												{count}
											</span>
										</Link>
									);
								})}
							</div>
						</div>
					))}
				</div>
			</section>

			{/* Totals */}
			<section className="space-y-4">
				<SectionHeading>Totals</SectionHeading>
				<div className="grid grid-cols-2 gap-4 sm:grid-cols-3 xl:grid-cols-5">
					{stats.map((stat) => (
						<Link
							key={stat.label}
							href={stat.href}
							className="group flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-colors hover:bg-muted/50"
						>
							<div className="flex items-center justify-between">
								<stat.icon className="h-4 w-4 text-muted-foreground" />
								<ArrowRightIcon className="h-3.5 w-3.5 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
							</div>
							<p className="mt-3 text-2xl font-semibold text-foreground tabular-nums">
								{stat.value}
							</p>
							<p className="text-sm text-muted-foreground">{stat.label}</p>
						</Link>
					))}
				</div>
			</section>
		</div>
	);
}
