import { NextRequest, NextResponse } from 'next/server';
import { checkRole } from '@/utils/roles';
import { prisma } from '@/lib/prisma';

// Mark this route as dynamic to eliminate build warnings
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
	try {
		// Check that the user is an admin
		const isAdmin = await checkRole('ADMIN');
		if (!isAdmin) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const { searchParams } = new URL(request.url);
		const orderNumber = searchParams.get('orderId');
		const userEmail = searchParams.get('userEmail');
		const action = searchParams.get('action');
		const limit = parseInt(searchParams.get('limit') || '100');

		// Build where clause
		const where: any = {};

		if (orderNumber) {
			where.order = {
				orderNumber: {
					contains: orderNumber,
					mode: 'insensitive',
				},
			};
		}

		if (userEmail) {
			where.userEmail = {
				contains: userEmail,
				mode: 'insensitive',
			};
		}

		if (action) {
			where.action = action;
		}

		// Query without user relation first (in case migration not applied)
		// Then try to enrich with user data
		const auditLogs = await prisma.auditLog.findMany({
			where,
			take: limit,
			orderBy: { createdAt: 'desc' },
			include: {
				order: {
					select: {
						orderNumber: true,
						status: true,
					},
				},
			},
		});

		// Try to get user data for each log
		const enrichedLogs = await Promise.all(
			auditLogs.map(async (log) => {
				let user = null;
				if (log.userId) {
					try {
						user = await prisma.user.findUnique({
							where: { id: log.userId },
							select: {
								email: true,
								role: true,
								profile: {
									select: {
										firstName: true,
										lastName: true,
									},
								},
							},
						});
					} catch {
						// User relation might not exist yet
					}
				}
				return { ...log, user };
			})
		);

		return NextResponse.json({ auditLogs: enrichedLogs });
	} catch (error) {
		console.error('Audit logs error:', error);
		return NextResponse.json(
			{ error: 'Failed to fetch audit logs' },
			{ status: 500 }
		);
	}
}
