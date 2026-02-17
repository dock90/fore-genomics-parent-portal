'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import {
	LayoutDashboardIcon,
	UsersIcon,
	PackageIcon,
	ShieldIcon,
	ActivityIcon,
} from 'lucide-react';

const navigationItems = [
	{
		name: 'Overview',
		href: '/admin',
		icon: LayoutDashboardIcon,
		description: 'Action items and system summary',
	},
	{
		name: 'Orders',
		href: '/admin/orders',
		icon: PackageIcon,
		description: 'Order management and report uploads',
	},
	{
		name: 'Users',
		href: '/admin/users',
		icon: UsersIcon,
		description: 'User management and role assignment',
	},
	{
		name: 'Audit Logs',
		href: '/admin/audit-logs',
		icon: ActivityIcon,
		description: 'HIPAA compliance and activity tracking',
	},
];

export function AdminNavigation() {
	const pathname = usePathname();

	return (
		<div className="w-64 bg-background border-r border-border min-h-screen">
			{/* Header */}
			<div className="p-6 border-b border-border">
				<div className="flex items-center gap-3">
					<ShieldIcon className="h-8 w-8 text-fore-blue" />
					<div>
						<h1 className="text-lg font-bold text-foreground">Admin Panel</h1>
						<p className="text-sm text-muted-foreground">
							Fore Genomics Parent Portal
						</p>
					</div>
				</div>
			</div>

			{/* Navigation */}
			<nav className="p-4">
				<ul className="space-y-2">
					{navigationItems.map((item) => {
						const isActive = pathname === item.href;
						return (
							<li key={item.name}>
								<Link
									href={item.href}
									className={cn(
										'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
										isActive
											? 'bg-secondary text-fore-teal border border-fore-teal/30'
											: 'text-foreground hover:bg-secondary hover:text-fore-teal'
									)}
									title={item.description}
								>
									<item.icon
										className={cn(
											'h-5 w-5',
											isActive ? 'text-fore-blue' : 'text-muted-foreground'
										)}
									/>
									{item.name}
								</Link>
							</li>
						);
					})}
				</ul>
			</nav>

			{/* Footer */}
			<div className="absolute bottom-0 w-64 p-4 border-t border-border">
				<div className="text-xs text-muted-foreground">
					<p>Admin Dashboard</p>
				</div>
			</div>
		</div>
	);
}
