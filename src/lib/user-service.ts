import { prisma } from '@/lib/prisma';
import { clerkClient } from '@clerk/nextjs/server';

/**
 * Get the database user for an authenticated Clerk session.
 * 
 * This is the ONLY place where clerkId is used for lookups.
 * Once you have the user, use user.id (database ID) for all other operations.
 * 
 * Flow:
 * 1. Try to find user by clerkId (fast path for returning users)
 * 2. If not found, get email from Clerk and find by email (for Stripe/admin-created users)
 * 3. If found by email, sync the clerkId for future lookups
 * 
 * @param clerkUserId - The userId from Clerk's auth()
 * @param include - Prisma include options for related data
 * @returns The database user with their database ID, or null if not found
 */
export async function getDbUser<T extends object>(
	clerkUserId: string,
	include?: T
) {
	// First try to find by clerkId (fast path)
	let user = await prisma.user.findUnique({
		where: { clerkId: clerkUserId },
		include: include as any,
	});

	if (user) {
		return user;
	}

	// If not found by clerkId, user might have been created via Stripe/admin before signing up
	// Get their email from Clerk and try to find by email
	const client = await clerkClient();
	const clerkUser = await client.users.getUser(clerkUserId);
	const email = clerkUser.emailAddresses[0]?.emailAddress;

	if (!email) {
		return null;
	}

	// Try to find user by email
	user = await prisma.user.findUnique({
		where: { email },
		include: include as any,
	});

	if (user && !user.clerkId) {
		// User exists but doesn't have clerkId - link them now
		user = await prisma.user.update({
			where: { id: user.id },
			data: { clerkId: clerkUserId },
			include: include as any,
		});
	}

	return user;
}

/**
 * @deprecated Use getDbUser instead - clearer naming
 */
export const findUserByClerkId = getDbUser;

/**
 * Get or create the database user for an authenticated Clerk session.
 * Creates a new user if one doesn't exist.
 * 
 * @param clerkUserId - The userId from Clerk's auth()
 * @param include - Prisma include options for related data
 * @returns The database user with their database ID
 */
export async function getOrCreateDbUser<T extends object>(
	clerkUserId: string,
	include?: T
) {
	let user = await getDbUser(clerkUserId, include);

	if (!user) {
		// Get email from Clerk to create new user
		const client = await clerkClient();
		const clerkUser = await client.users.getUser(clerkUserId);
		const email = clerkUser.emailAddresses[0]?.emailAddress;

		if (!email) {
			throw new Error('No email found for Clerk user');
		}

		user = await prisma.user.create({
			data: {
				clerkId: clerkUserId,
				email,
				role: 'PARENT',
			},
			include: include as any,
		});
	}

	return user;
}
