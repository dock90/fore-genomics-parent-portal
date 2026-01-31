import { NextRequest, NextResponse } from 'next/server';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { headers } from 'next/headers';
import { getDbUser } from '@/lib/user-service';

// Mark this route as dynamic to eliminate build warnings
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
	try {
		const { userId: clerkUserId } = await auth();

		if (!clerkUserId) {
			// If no user is authenticated, just redirect to home
			return NextResponse.redirect(new URL('/', request.url));
		}

		// Get user and log before signing out
		try {
			const client = await clerkClient();

			// Get database user - uses clerkId internally but returns user with database ID
			const dbUser = await getDbUser(clerkUserId);

			if (dbUser) {
				// Get request headers for audit trail
				const headersList = await headers();
				const ipAddress =
					headersList.get('x-forwarded-for')?.split(',')[0] ||
					headersList.get('x-real-ip') ||
					'unknown';
				const userAgent = headersList.get('user-agent') || null;

				// Create audit log entry for logout
				await prisma.auditLog.create({
					data: {
						action: 'USER_LOGOUT',
						userId: dbUser.id,
						userEmail: dbUser.email,
						ipAddress,
						userAgent,
						details: {
							timestamp: new Date().toISOString(),
						},
					},
				});
			}

			// Sign out the user from Clerk
			await client.sessions.revokeSession(clerkUserId);
		} catch (clerkError) {
			// If the user was already deleted from Clerk (like during reset),
			// this will fail but that's expected
		}

		// Redirect to home page
		return NextResponse.redirect(new URL('/', request.url));
	} catch (error) {
		// Even if there's an error, redirect to home
		return NextResponse.redirect(new URL('/', request.url));
	}
}
