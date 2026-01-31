import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { createLogger } from '@/lib/logger';
import { getDbUser } from '@/lib/user-service';

const log = createLogger('AuthLog');

export async function POST(request: NextRequest) {
	try {
		const { userId: clerkUserId } = await auth();

		if (!clerkUserId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const { action } = body;

		if (!action || !['USER_LOGIN', 'USER_LOGOUT'].includes(action)) {
			return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
		}

		// Get database user - uses clerkId internally but returns user with database ID
		const dbUser = await getDbUser(clerkUserId);

		if (!dbUser) {
			// User doesn't exist in our database yet, skip logging
			return NextResponse.json({ success: true, skipped: true });
		}

		// Get request headers for audit trail
		const headersList = await headers();
		const ipAddress =
			headersList.get('x-forwarded-for')?.split(',')[0] ||
			headersList.get('x-real-ip') ||
			'unknown';
		const userAgent = headersList.get('user-agent') || null;

		// Create audit log entry linked to the database user
		await prisma.auditLog.create({
			data: {
				action,
				userId: dbUser.id,
				userEmail,
				ipAddress,
				userAgent,
				details: {
					timestamp: new Date().toISOString(),
				},
			},
		});

		return NextResponse.json({ success: true });
	} catch (error) {
		log.error('Auth log error', error);
		return NextResponse.json(
			{ error: 'Failed to log auth event' },
			{ status: 500 }
		);
	}
}
