'use client';

import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { ChevronRightIcon } from 'lucide-react';

interface UserData {
	id: string;
	email: string;
	role: string;
	createdAt: string | Date;
	profile?: {
		id: string;
		firstName: string;
		lastName: string;
		address: string;
		addressLine2?: string | null;
		city: string;
		state: string;
		zipCode: string;
	} | null;
	consents: Array<{ id: string }>;
	children: Array<{ id: string }>;
	questionnaires: Array<{ id: string }>;
}

interface UserDataManagementProps {
	users: UserData[];
}

export function UserDataManagement({ users }: UserDataManagementProps) {
	if (users.length === 0) {
		return (
			<div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg">
				<p className="text-sm text-muted-foreground">No users found</p>
			</div>
		);
	}

	return (
		<div className="space-y-3">
			<h2 className="text-sm font-medium text-foreground">
				All Users ({users.length})
			</h2>
			<div className="border border-border rounded-lg divide-y divide-border">
				{users.map((user) => (
					<Link
						key={user.id}
						href={`/admin/users/${user.id}`}
						className="flex items-center justify-between p-4 hover:bg-muted/50 transition-colors"
					>
						<div className="flex-1 min-w-0">
							<div className="flex items-center gap-3">
								<p className="text-sm font-medium text-foreground truncate">
									{user.profile
										? `${user.profile.firstName} ${user.profile.lastName}`
										: user.email}
								</p>
								<Badge variant="outline" className="text-xs shrink-0">
									{user.role}
								</Badge>
							</div>
							<p className="text-xs text-muted-foreground mt-0.5">
								{user.email}
							</p>
						</div>
						<div className="flex items-center gap-4 ml-4">
							<div className="hidden sm:flex items-center gap-3 text-xs text-muted-foreground">
								{user.children.length > 0 && (
									<span>
										{user.children.length} child
										{user.children.length !== 1 ? 'ren' : ''}
									</span>
								)}
								{user.consents.length > 0 && (
									<span>
										{user.consents.length} consent
										{user.consents.length !== 1 ? 's' : ''}
									</span>
								)}
							</div>
							<ChevronRightIcon className="h-4 w-4 text-muted-foreground" />
						</div>
					</Link>
				))}
			</div>
		</div>
	);
}
