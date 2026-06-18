'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';
import { KitService } from '@/lib/kit-service';
import { postOrderEventToSlack, buildAdminOrderUrl } from '@/lib/slack';

const createOrderSchema = z
	.object({
		userType: z.enum(['existing', 'new']),
		userId: z.string().nullable().optional(),
		firstName: z.string().nullable().optional(),
		lastName: z.string().nullable().optional(),
		email: z.string().email().nullable().optional(),
		notes: z.string().nullable().optional(),
		kitCount: z.number().min(1).max(10).optional(),
		kitTypes: z.array(z.enum(['BASE', 'PLUS', 'PREMIUM'])).optional(),
	})
	.refine(
		(data) => {
			if (data.userType === 'existing') {
				return data.userId && data.userId.length > 0;
			} else {
				return data.firstName && data.lastName && data.email;
			}
		},
		{
			message: 'Please fill in all required fields',
		}
	);

// Define response types
export type CreateOrderResult =
	| { success: true; order: any }
	| { success: false; error: string };

export async function createOrder(
	formData: FormData
): Promise<CreateOrderResult> {
	try {
		// Parse and validate the form data
		const validatedData = createOrderSchema.parse({
			userType: formData.get('userType'),
			userId: formData.get('userId'),
			firstName: formData.get('firstName'),
			lastName: formData.get('lastName'),
			email: formData.get('email'),
			notes: formData.get('notes'),
			kitCount: parseInt(formData.get('kitCount') as string) || 1,
			kitTypes: formData.get('kitTypes')
				? JSON.parse(formData.get('kitTypes') as string)
				: undefined,
		});

		let userId: string;

		if (validatedData.userType === 'existing') {
			// Verify existing user exists
			const user = await prisma.user.findUnique({
				where: { id: validatedData.userId! },
			});

			if (!user) {
				return {
					success: false,
					error: 'User not found. Please refresh the page and try again.',
				};
			}

			userId = validatedData.userId!;
		} else {
			// Check if user with this email already exists
			const existingUser = await prisma.user.findUnique({
				where: { email: validatedData.email! },
			});

			if (existingUser) {
				return {
					success: false,
					error: `A user with the email address "${validatedData.email}" already exists. Please select "Existing User" and choose this user from the list, or use a different email address.`,
				};
			}

			// Create new user
			const newUser = await prisma.user.create({
				data: {
					email: validatedData.email!,
					role: 'PARENT',
					profile: {
						create: {
							firstName: validatedData.firstName!,
							lastName: validatedData.lastName!,
							address: '', // Will be filled during onboarding
							city: '',
							state: '',
							zipCode: '',
							phone: '',
						},
					},
				},
			});

			userId = newUser.id;

			// Create Clerk invitation for the new user
			try {
				const client = await clerkClient();
				await client.invitations.createInvitation({
					emailAddress: validatedData.email!,
					notify: true,
					ignoreExisting: true,
					publicMetadata: {
						role: 'PARENT',
						createdByAdmin: true,
						orderId: newUser.id,
					},
					redirectUrl: process.env.NEXT_PUBLIC_CLERK_INVITATION_REDIRECT_URL,
				});
			} catch (clerkError: any) {
				const code = (clerkError as any).errors?.[0]?.code;
				if (code !== 'duplicate_record') {
					// Log non-duplicate errors — invitation failure is silent to the admin form
					// but visible in Vercel function logs
					console.error('[createOrder] Clerk invitation failed', {
						email: validatedData.email,
						error: (clerkError as any)?.message,
						code,
					});
				}
				// Don't fail the entire request if Clerk invitation fails
			}

			// Note: We do NOT set onboardingComplete metadata for new users
			// They need to complete the onboarding process first
		}

		// Create the order with a sequential, collision-safe admin order number
		// (format: YYMMDD_ADM####_kitCount). The unique constraint on orderNumber
		// plus the retry loop guarantees no duplicates under concurrent creates.
		const kitCount = validatedData.kitCount || 1;

		const now = new Date();
		const datePart =
			now.getFullYear().toString().slice(-2) +
			(now.getMonth() + 1).toString().padStart(2, '0') +
			now.getDate().toString().padStart(2, '0');
		const baseSeq =
			(await prisma.order.count({
				where: { orderNumber: { contains: '_ADM' } },
			})) + 1;

		let order: any = null;
		const MAX_ATTEMPTS = 10;
		for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
			const seq = (baseSeq + attempt).toString().padStart(4, '0');
			const orderNumber = `${datePart}_ADM${seq}_${kitCount}`;
			try {
				order = await prisma.order.create({
					data: {
						parentId: userId, // Admin-created orders are typically for parents
						purchaserId: userId, // Same user is both parent and purchaser initially
						status: 'ORDER_RECEIVED' as any,
						notes: validatedData.notes || null,
						orderNumber,
						kitCount,
						statusUpdatedAt: new Date(),
					},
				});
				break;
			} catch (createError: any) {
				const isOrderNumberCollision =
					createError?.code === 'P2002' &&
					String(createError?.meta?.target ?? '').includes('orderNumber');
				if (isOrderNumberCollision && attempt < MAX_ATTEMPTS - 1) {
					continue; // sequence already taken — try the next one
				}
				throw createError;
			}
		}

		if (!order) {
			return {
				success: false,
				error: 'Could not generate a unique order number. Please try again.',
			};
		}

		// Create kits for the order
		const kitTypes = validatedData.kitTypes || Array(kitCount).fill('BASE');

		try {
			await KitService.createKitsForOrder(order.id, kitCount, kitTypes);
		} catch (kitError) {
			return {
				success: false,
				error:
					'Order created but failed to create test kits. Please contact support.',
			};
		}

		// Announce the new order in Slack (#orders) — PHI-free (order number + status only).
		await postOrderEventToSlack({
			orderNumber: order.orderNumber,
			status: order.status,
			statusLabel: 'Order Received',
			event: 'created',
			kitCount,
			adminUrl: buildAdminOrderUrl(order.id),
		});

		revalidatePath('/admin/orders');
		return { success: true, order };
	} catch (error) {
		if (error instanceof z.ZodError) {
			return {
				success: false,
				error: `Validation error: ${error.errors.map((e) => e.message).join(', ')}`,
			};
		}

		// Handle Prisma-specific errors
		if (error && typeof error === 'object' && 'code' in error) {
			const prismaError = error as any;
			switch (prismaError.code) {
				case 'P2002':
					if (prismaError.meta?.target?.includes('email')) {
						return {
							success: false,
							error:
								'A user with this email address already exists. Please use a different email or select an existing user.',
						};
					}
					return {
						success: false,
						error:
							'A record with this information already exists. Please check your input and try again.',
					};
				case 'P2003':
					return {
						success: false,
						error:
							'Invalid reference. Please check that all required relationships are properly set.',
					};
				case 'P2025':
					return {
						success: false,
						error:
							'The requested record was not found. Please refresh and try again.',
					};
				default:
					return {
						success: false,
						error: `Database error: ${prismaError.message || 'Unknown database error occurred'}`,
					};
			}
		}

		return {
			success: false,
			error: error instanceof Error ? error.message : 'Failed to create order',
		};
	}
}

