'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { KitService } from '@/lib/kit-service';
import { postOrderEventToSlack, buildAdminOrderUrl } from '@/lib/slack';
import { getDbUser } from '@/lib/user-service';
import { trackInviteSent } from '@/lib/klaviyo';

// Per-kit pre-fill payload. When an admin already has the signed paper TRF and
// child info (e.g. an order placed before the Health Hub existed), they can
// enter it here so the parent skips onboarding and lands straight on results.
const prefillChildSchema = z.object({
	isUnborn: z.boolean().optional().default(false),
	firstName: z.string().nullable().optional(),
	lastName: z.string().nullable().optional(),
	dob: z.string().nullable().optional(),
	sex: z.string().nullable().optional(),
	ethnicities: z.array(z.string()).optional().default([]),
	dueDate: z.string().nullable().optional(),
	relationshipToChild: z
		.enum(['MOTHER', 'FATHER', 'GUARDIAN', 'OTHER'])
		.nullable()
		.optional(),
	// Consent is recorded as pre-collected from the signed paper TRF — the
	// parent does NOT re-sign in the portal.
	consentPreCollected: z.boolean().optional().default(false),
	consentSignerName: z.string().nullable().optional(),
	consentReference: z.string().nullable().optional(),
	q1: z.string().optional().default('false'),
	q1Details: z.string().nullable().optional(),
	q2: z.string().optional().default('false'),
	q2Details: z.string().nullable().optional(),
	q3: z.string().optional().default('false'),
	q3Details: z.string().nullable().optional(),
});

type PrefillChild = z.infer<typeof prefillChildSchema>;

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
		prefill: z.boolean().optional(),
		children: z.array(prefillChildSchema).optional(),
		// Hold the Clerk portal invite so the admin can send it manually later
		// (from the order page) once all info is in place.
		holdInvite: z.boolean().optional(),
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
	)
	.refine(
		(data) => {
			// When pre-filling, require one child entry per kit.
			if (!data.prefill) return true;
			const count = data.kitCount || 1;
			return Array.isArray(data.children) && data.children.length === count;
		},
		{
			message:
				'Pre-fill is enabled but child information is missing for one or more kits.',
		}
	)
	.refine(
		(data) => {
			// Every born (not unborn) child must have consent recorded as
			// pre-collected, with a signer name and relationship.
			if (!data.prefill || !data.children) return true;
			return data.children.every((c) => {
				if (c.isUnborn) return true;
				return (
					c.consentPreCollected &&
					!!c.consentSignerName?.trim() &&
					!!c.relationshipToChild
				);
			});
		},
		{
			message:
				'For each child, confirm consent was collected on the signed TRF and provide the signer name and relationship.',
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
			prefill: formData.get('prefill') === 'true',
			children: formData.get('children')
				? JSON.parse(formData.get('children') as string)
				: undefined,
			holdInvite: formData.get('holdInvite') === 'true',
		});

		let userId: string;
		// Captured when a new parent invite is created below, so we can fire the
		// Klaviyo "Invite Sent" event (with the activation URL) after the order
		// exists and we have its order number for context.
		let parentInviteUrl: string | undefined;

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

			// Hold the Clerk invitation when pre-filling, or whenever the admin
			// explicitly chose to send it manually. The invite is then sent from
			// the order page once all info (signed TRF, results) is added.
			// Otherwise, invite the new user immediately as before.
			if (!validatedData.prefill && !validatedData.holdInvite) {
				// Create Clerk invitation for the new user
				try {
					const client = await clerkClient();
					const invitation = await client.invitations.createInvitation({
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
					parentInviteUrl = invitation.url;
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

		// Klaviyo: Invite Sent — enter the newly invited parent into the Health Hub
		// invite/onboarding reminder flow immediately. Only fires when a fresh Clerk
		// invite was actually sent above (parentInviteUrl set) — i.e. new user, not
		// held and not pre-filled. Held/pre-filled invites fire later via
		// sendParentPortalInvite; existing users are already invited.
		if (parentInviteUrl) {
			await trackInviteSent({
				email: validatedData.email!,
				orderId: order.id,
				orderNumber: order.orderNumber,
				inviteUrl: parentInviteUrl,
			});
		}

		// Pre-fill child info, consent (pre-collected from paper TRF) and the
		// pre-test questionnaire so the parent skips onboarding and lands on the
		// dashboard/results when they accept the Clerk invite and log in.
		let didPrefill = false;
		if (validatedData.prefill && validatedData.children) {
			try {
				await prefillKitData(order.id, userId, validatedData.children);
				didPrefill = true;
			} catch (prefillError) {
				return {
					success: false,
					error:
						'Order and kits created, but pre-filling child information failed. Open the order to finish entering details.',
				};
			}
		}

		// Announce the new order in Slack (#orders) — PHI-free (order number + status only).
		await postOrderEventToSlack({
			orderNumber: order.orderNumber,
			status: didPrefill ? 'ONBOARDING_COMPLETED' : order.status,
			statusLabel: didPrefill
				? 'Onboarding Completed (admin pre-filled)'
				: 'Order Received',
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

/**
 * Pre-populate each kit on an order with child info, a pre-collected consent
 * record (sourced from the signed paper TRF — not re-signed in the portal),
 * and the pre-test questionnaire. Then move the order to ONBOARDING_COMPLETED
 * so the onboarding gate is satisfied and the parent goes straight to the
 * dashboard on first login.
 *
 * Children are matched to kits by position (children[i] -> kit #(i+1)).
 */
async function prefillKitData(
	orderId: string,
	parentUserId: string,
	children: PrefillChild[]
): Promise<void> {
	const kits = await prisma.kit.findMany({
		where: { orderId },
		orderBy: { kitNumber: 'asc' },
	});

	for (let i = 0; i < kits.length; i++) {
		const kit = kits[i];
		const c = children[i];
		if (!c) continue;

		// 1) Child
		const child = await prisma.child.create({
			data: {
				userId: parentUserId,
				firstName: c.isUnborn ? null : c.firstName || null,
				lastName: c.isUnborn ? null : c.lastName || null,
				dob: c.isUnborn ? null : c.dob || null,
				sex: c.isUnborn ? null : c.sex || null,
				ethnicities: c.ethnicities || [],
				dueDate: c.isUnborn ? c.dueDate || null : null,
			},
		});
		await prisma.kit.update({
			where: { id: kit.id },
			data: { childId: child.id },
		});

		// Unborn children have no results yet — only the child record is needed
		// to satisfy the onboarding gate. Skip consent/questionnaire.
		if (c.isUnborn) continue;

		// 2) Consent — recorded as pre-collected from the signed paper TRF.
		const consent = await prisma.consent.create({
			data: {
				userId: parentUserId,
				childId: child.id,
				accepted: true,
				consentAll: true,
				part1Accepted: true,
				part2Accepted: true,
				part3Accepted: true,
				signerName: c.consentSignerName || null,
				relationshipToChild: c.relationshipToChild || null,
				signatureDate: new Date(),
				consentFileName: c.consentReference || null,
				signature: 'Pre-collected from signed paper TRF (admin-entered)',
			},
		});
		await prisma.kit.update({
			where: { id: kit.id },
			data: { consentId: consent.id },
		});

		// 3) Pre-test questionnaire
		const questionnaire = await prisma.questionnaire.create({
			data: {
				userId: parentUserId,
				question1: c.q1 || 'false',
				question1Details: c.q1Details || '',
				question2: c.q2 || 'false',
				question2Details: c.q2Details || '',
				question3: c.q3 || 'false',
				question3Details: c.q3Details || '',
			},
		});
		await prisma.kit.update({
			where: { id: kit.id },
			data: { questionnaireId: questionnaire.id },
		});
	}

	// Satisfy the onboarding gate (status must not be ORDER_RECEIVED).
	await prisma.order.update({
		where: { id: orderId },
		data: { status: 'ONBOARDING_COMPLETED', statusUpdatedAt: new Date() },
	});

	// Audit trail — who pre-filled, for which order, and that consent was
	// recorded as pre-collected rather than e-signed.
	try {
		const { userId: clerkId } = await auth();
		const admin = clerkId ? await getDbUser(clerkId) : null;
		await prisma.auditLog.create({
			data: {
				orderId,
				action: 'ADMIN_PREFILL_ACCOUNT',
				userId: admin?.id ?? null,
				userEmail: admin?.email ?? 'unknown',
				details: {
					kitCount: kits.length,
					consentSource: 'PRE_COLLECTED_PAPER_TRF',
				},
			},
		});
	} catch {
		// Audit logging must never break the create flow.
	}
}
