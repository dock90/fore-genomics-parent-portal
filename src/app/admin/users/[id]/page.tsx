import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { UserDetail } from './UserDetail';

interface UserDetailPageProps {
	params: Promise<{ id: string }>;
}

export default async function UserDetailPage({ params }: UserDetailPageProps) {
	const { id } = await params;

	const user = await prisma.user.findUnique({
		where: { id },
		include: {
			profile: true,
			consents: {
				include: {
					kit: {
						include: {
							child: true,
							order: true,
						},
					},
				},
			},
			parentOrders: {
				include: {
					kits: {
						include: {
							child: true,
						},
					},
				},
			},
			purchaserOrders: {
				include: {
					kits: {
						include: {
							child: true,
						},
					},
				},
			},
			children: true,
			questionnaires: true,
		},
	});

	if (!user) {
		notFound();
	}

	return <UserDetail user={user} />;
}

