import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import { OrderDetail } from './OrderDetail';

interface OrderDetailPageProps {
	params: { id: string };
}

export default async function OrderDetailPage({ params }: OrderDetailPageProps) {
	const { id } = params;

	const order = await prisma.order.findUnique({
		where: { id },
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
			kits: {
				orderBy: {
					kitNumber: 'asc',
				},
				include: {
					child: true,
					consent: {
						select: {
							id: true,
							consentFileName: true,
							accepted: true,
							signerName: true,
							signatureDate: true,
						},
					},
					questionnaire: {
						select: {
							id: true,
						},
					},
				},
			},
			auditLogs: {
				take: 50,
				orderBy: {
					createdAt: 'desc',
				},
				select: {
					id: true,
					action: true,
					userEmail: true,
					createdAt: true,
					details: true,
				},
			},
		},
	});

	if (!order) {
		notFound();
	}

	return <OrderDetail order={order} />;
}

