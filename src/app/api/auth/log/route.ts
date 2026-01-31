import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { createLogger } from '@/lib/logger';

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

		// Get user email from Clerk
		const client = await clerkClient();
		const clerkUser = await client.users.getUser(clerkUserId);
		const userEmail = clerkUser.emailAddresses[0]?.emailAddress || 'unknown';

		// Find the database user by email
		const dbUser = await prisma.user.findUnique({
			where: { email: userEmail },
		});

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
