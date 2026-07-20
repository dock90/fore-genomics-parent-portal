'use client';

import Link from 'next/link';
import Image from 'next/image';
import { usePathname } from 'next/navigation';
import { cn } from "@/lib/utils";
import {
	LayoutDashboardIcon,
	UsersIcon,
	PackageIcon,
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
			<div className="flex h-16 items-center border-b border-border px-6">
				<Link href="/admin" className="flex items-center">
					<Image
						src="/images/logos/fore-genomics-logo-green.svg"
						alt="Fore Genomics"
						width={158}
						height={20}
						className="h-5 w-auto"
						priority
					/>
				</Link>
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

		</div>
	);
}
