import { prisma } from '@/lib/prisma';
import Stripe from 'stripe';
import { clerkClient } from '@clerk/nextjs/server';
import { createLogger } from '@/lib/logger';

const log = createLogger('StripeOrderService');

export class StripeOrderService {
	/**
	 * Creates a new order from Stripe checkout session data
	 */
	static async createOrderFromCheckout(
		checkoutSession: Stripe.Checkout.Session
	) {
		try {
			// Extract customer information - check both customer_details.email and customer_email
			const customerEmail =
				checkoutSession.customer_details?.email ||
				checkoutSession.customer_email;
			if (!customerEmail) {
				throw new Error('No customer email found in checkout session');
			}

			// Find or create user
			let user = await prisma.user.findUnique({
				where: { email: customerEmail },
				include: { profile: true },
			});

			let isNewUser = false;
			if (!user) {
				user = await prisma.user.create({
					data: {
						email: customerEmail,
						role: 'PARENT',
					},
					include: { profile: true },
				});
				isNewUser = true;
			}

			// Create or update user profile with Stripe data
			if (checkoutSession.customer_details) {
				const profileData = this.mapStripeAddressToProfile(checkoutSession);

				if (profileData) {
					await prisma.userProfile.upsert({
						where: { userId: user.id },
						update: profileData,
						create: {
							userId: user.id,
							...profileData,
						},
					});
				}
			}

		// Determine kit count and types from line items
		const { kitCount, kitTypes } = this.extractKitInfoFromLineItems(
			checkoutSession.line_items
		);

		// Generate order number with checkout session ID and kit count
		const orderNumber = this.generateOrderNumber(checkoutSession.id, kitCount);

			// Create the order
			const order = await prisma.order.create({
				data: {
					parentId: user.id,
					purchaserId: user.id, // Same user is both parent and purchaser initially
					status: 'ORDER_RECEIVED',
					orderNumber,
					kitCount,
					statusUpdatedAt: new Date(),
					notes: `Order created from Stripe checkout session: ${checkoutSession.id}`,
				},
			});

			// Create kits for the order
			await this.createKitsForOrder(order.id, kitCount, kitTypes);

			// Create Clerk invitation for new users
			if (isNewUser) {
				try {
					const client = await clerkClient();
					await client.invitations.createInvitation({
						emailAddress: customerEmail,
						publicMetadata: {
							role: 'PARENT',
							createdByStripe: true,
							orderId: order.id,
							stripeCheckoutSessionId: checkoutSession.id,
						},
						redirectUrl: process.env.NEXT_PUBLIC_CLERK_INVITATION_REDIRECT_URL,
					});
				} catch (clerkError: any) {
					// Handle duplicate invitation error gracefully
					if (clerkError.errors?.[0]?.code === 'duplicate_record') {
					} else {
					}
					// Don't fail the entire request if Clerk invitation fails
					// The user can still be created and the order can proceed
				}
			}

			// Log audit trail
			await prisma.auditLog.create({
				data: {
					orderId: order.id,
					action: 'ORDER_CREATED_FROM_STRIPE',
					userId: user.id,
					userEmail: user.email,
					details: {
						stripeCheckoutSessionId: checkoutSession.id,
						stripeCustomerEmail: customerEmail,
						kitCount,
						kitTypes,
						amount: checkoutSession.amount_total,
						currency: checkoutSession.currency,
						isNewUser,
						clerkInvitationSent: isNewUser,
					},
				},
			});

			return order;
		} catch (error) {
			throw error;
		}
	}

	/**
	 * Maps Stripe address data to UserProfile fields
	 */
	private static mapStripeAddressToProfile(
		checkoutSession: Stripe.Checkout.Session
	) {
		const customerDetails = checkoutSession.customer_details;

		if (!customerDetails?.address) {
			return null;
		}

		const nameParts = customerDetails.name?.split(' ') || [];
		const firstName = nameParts[0] || '';
		const lastName = nameParts.slice(1).join(' ') || '';

		return {
			firstName,
			lastName,
			address: customerDetails.address.line1 || '',
			addressLine2: customerDetails.address.line2 || null,
			city: customerDetails.address.city || '',
			state: customerDetails.address.state || '',
			zipCode: customerDetails.address.postal_code || '',
			phone: customerDetails.phone || '',
		};
	}

	/**
	 * Extracts kit information from Stripe line items
	 */
	private static extractKitInfoFromLineItems(
		lineItems: Stripe.ApiList<Stripe.LineItem> | undefined
	) {
		if (!lineItems || lineItems.data.length === 0) {
			return { kitCount: 1, kitTypes: ['BASE'] };
		}

		const kitCount = lineItems.data.length;
		const kitTypes = lineItems.data.map((item) => {
			// Check if product is expanded (object) or just an ID (string)
			const productMetadata =
				typeof item.price?.product === 'object' &&
				'metadata' in item.price.product
					? item.price.product.metadata
					: undefined;

			// Try to get kit type from multiple possible locations
			const kitType = item.price?.metadata?.kitType || productMetadata?.kitType;

			if (!kitType) {
				log.warn(`No kitType metadata found for price ${item.price?.id}, defaulting to BASE. Checked: price.metadata, product.metadata`);
				return 'BASE';
			}

			// Validate kit type
			const validKitTypes = ['BASE', 'PLUS', 'PREMIUM'];
			if (!validKitTypes.includes(kitType)) {
				log.warn(`Invalid kitType "${kitType}" for price ${item.price?.id}, defaulting to BASE`);
				return 'BASE';
			}

			return kitType;
		});

		return { kitCount, kitTypes };
	}

	/**
	 * Creates kits for an order
	 */
	private static async createKitsForOrder(
		orderId: string,
		kitCount: number,
		kitTypes: string[]
	) {
		const kits = [];

		for (let i = 0; i < kitCount; i++) {
			const kitType = kitTypes[i] || 'BASE';

			const kit = await prisma.kit.create({
				data: {
					orderId,
					kitNumber: i + 1,
					kitType: kitType as any, // Cast to your enum type
				},
			});

			kits.push(kit);
		}

		return kits;
	}

	/**
	 * Generates a unique order number in format: YYMMDD_(Stripe session ID suffix)_(kit count)
	 */
	private static generateOrderNumber(
		checkoutSessionId: string,
		kitCount: number
	): string {
		const now = new Date();
		const yy = now.getFullYear().toString().slice(-2);
		const mm = (now.getMonth() + 1).toString().padStart(2, '0');
		const dd = now.getDate().toString().padStart(2, '0');
		const datePart = `${yy}${mm}${dd}`;

		// Extract last 8 characters of the checkout session ID
		const stripeIdSuffix = checkoutSessionId.slice(-8);

		return `${datePart}_${stripeIdSuffix}_${kitCount}`;
	}
}
