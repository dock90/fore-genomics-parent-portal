import { Webhook } from 'svix';
import { headers } from 'next/headers';
import { WebhookEvent } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';
import { trackAccountCreated, trackInviteSent } from '@/lib/klaviyo';

const log = createLogger('ClerkWebhook');

export async function POST(req: Request) {
	const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

	if (!WEBHOOK_SECRET) {
		log.error('Missing CLERK_WEBHOOK_SECRET environment variable');
		return new Response('Webhook secret not configured', { status: 500 });
	}

	// Get the headers
	const headerPayload = await headers();
	const svix_id = headerPayload.get('svix-id');
	const svix_timestamp = headerPayload.get('svix-timestamp');
	const svix_signature = headerPayload.get('svix-signature');

	// If there are no headers, error out
	if (!svix_id || !svix_timestamp || !svix_signature) {
		return new Response('Missing svix headers', { status: 400 });
	}

	// Get the body
	const payload = await req.json();
	const body = JSON.stringify(payload);

	// Create a new Svix instance with your secret
	const wh = new Webhook(WEBHOOK_SECRET);

	let evt: WebhookEvent;

	// Verify the payload with the headers
	try {
		evt = wh.verify(body, {
			'svix-id': svix_id,
			'svix-timestamp': svix_timestamp,
			'svix-signature': svix_signature,
		}) as WebhookEvent;
	} catch (err) {
		log.error('Error verifying webhook', err);
		return new Response('Invalid signature', { status: 400 });
	}

	const eventType = evt.type;

	// Handle user.created — fire Klaviyo Account Created to stop invite reminder flow
	if (eventType === 'user.created') {
		const { email_addresses, primary_email_address_id } = evt.data;
		const primaryEmail = email_addresses?.find(
			(e) => e.id === primary_email_address_id
		)?.email_address;

		if (primaryEmail) {
			await trackAccountCreated({ email: primaryEmail });
			log.info('Account Created Klaviyo event fired', { email: primaryEmail });
		}
	}

	// Handle invitation.created — fire Klaviyo Invite Sent to start 6-hr reminder flow
	// Cast to any: Clerk's TS types don't include invitation.* events yet
	if ((eventType as string) === 'invitation.created') {
		const { email_address } = (evt as any).data;

		if (email_address) {
			// Look up the most recent order for this email to pass order context
			const order = await prisma.order.findFirst({
				where: {
					purchaser: { email: email_address },
				},
				orderBy: { createdAt: 'desc' },
				select: { id: true, orderNumber: true },
			});

			await trackInviteSent({
				email: email_address,
				orderId: order?.id,
				orderNumber: order?.orderNumber,
			});
			log.info('Invite Sent Klaviyo event fired', { email: email_address });
		}
	}

	// Handle user.updated event - sync email changes
	if (eventType === 'user.updated') {
		const { id: clerkId, email_addresses, primary_email_address_id } = evt.data;

		// Find the primary email
		const primaryEmail = email_addresses?.find(
			(email) => email.id === primary_email_address_id
		);

		if (!primaryEmail?.email_address) {
			log.warn('No primary email found for user', { clerkId });
			return new Response('No primary email', { status: 200 });
		}

		const newEmail = primaryEmail.email_address;

		try {
			// Find user by clerkId
			const user = await prisma.user.findUnique({
				where: { clerkId },
			});

			if (!user) {
				log.warn('User not found for clerkId', { clerkId });
				return new Response('User not found', { status: 200 });
			}

			// Only update if email has changed
			if (user.email !== newEmail) {
				// Check if new email is already taken by another user
				const existingUser = await prisma.user.findUnique({
					where: { email: newEmail },
				});

				if (existingUser && existingUser.id !== user.id) {
					log.error('Email already in use by another user', {
						clerkId,
						newEmail,
						existingUserId: existingUser.id,
					});
					return new Response('Email already in use', { status: 409 });
				}

				// Update the email
				await prisma.user.update({
					where: { id: user.id },
					data: { email: newEmail },
				});

				log.info('User email updated', {
					userId: user.id,
					oldEmail: user.email,
					newEmail,
				});
			}
		} catch (error) {
			log.error('Error updating user email', error);
			return new Response('Error updating user', { status: 500 });
		}
	}

	// Handle user.deleted event - optionally clean up user data
	if (eventType === 'user.deleted') {
		const { id: clerkId } = evt.data;

		try {
			const user = await prisma.user.findUnique({
				where: { clerkId },
			});

			if (user) {
				// Clear the clerkId but keep the user record (for order history, etc.)
				await prisma.user.update({
					where: { id: user.id },
					data: { clerkId: null },
				});

				log.info('User clerkId cleared after Clerk deletion', {
					userId: user.id,
					clerkId,
				});
			}
		} catch (error) {
			log.error('Error handling user deletion', error);
			return new Response('Error handling deletion', { status: 500 });
		}
	}

	return new Response('Webhook processed', { status: 200 });
}
