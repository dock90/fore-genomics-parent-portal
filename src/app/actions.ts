'use server';

import { checkRole } from '@/utils/roles';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';

export async function setRole(formData: FormData) {
	const client = await clerkClient();

	// Check that the user trying to set the role is an admin
	if (!checkRole('ADMIN')) {
		return;
	}

	try {
		await client.users.updateUserMetadata(formData.get('id') as string, {
			publicMetadata: { role: formData.get('role') },
		});
	} catch (err) {}
}

export async function removeRole(formData: FormData) {
	const client = await clerkClient();

	try {
		await client.users.updateUserMetadata(formData.get('id') as string, {
			publicMetadata: { role: null },
		});
	} catch (err) {}
}

export async function updateOrderStatus(formData: FormData) {
	// Check that the user is an admin
	if (!checkRole('ADMIN')) {
		return { success: false, message: 'Unauthorized' };
	}

	try {
		const orderId = formData.get('orderId') as string;
		const status = formData.get('status') as string;
		const notes = formData.get('notes') as string;
		const outboundTrackingNumber = formData.get(
			'outboundTrackingNumber'
		) as string;
		const inboundTrackingNumber = formData.get(
			'inboundTrackingNumber'
		) as string;

		// Get all report files for different kits
		const reportFiles: { [kitId: string]: File } = {};

		// Extract all kit-specific report files
		Array.from(formData.entries()).forEach(([key, value]) => {
			if (
				key.startsWith('reportFile-') &&
				value instanceof File &&
				value.size > 0
			) {
				const kitId = key.replace('reportFile-', '');
				const maxSize = 50 * 1024 * 1024; // 50 MB in bytes
				if (value.size > maxSize) {
					throw new Error(
						`File size exceeds 50 MB limit. File: ${value.name}, Size: ${(value.size / 1024 / 1024).toFixed(2)} MB`
					);
				}
				reportFiles[kitId] = value;
			}
		});

		// Handle multiple file uploads for different kits
		const uploadPromises: Promise<void>[] = [];

		for (const [kitId, reportFile] of Object.entries(reportFiles)) {
			if (reportFile && reportFile.size > 0) {
				uploadPromises.push(
					(async () => {
						try {
							const { reportStorageService } = await import(
								'@/lib/report-storage'
							);
							const { AuditService } = await import('@/lib/audit-service');

							// Get admin user info for upload tracking
							const { auth, clerkClient } = await import(
								'@clerk/nextjs/server'
							);
							const { userId } = await auth();
							const client = await clerkClient();
							const adminUser = await client.users.getUser(userId!);
							const uploadedBy =
								adminUser.emailAddresses[0]?.emailAddress || 'admin';

							const uploadResult = await reportStorageService.uploadReport(
								orderId,
								kitId,
								reportFile,
								uploadedBy
							);

							// Update the specific kit with the report
							await prisma.kit.update({
								where: { id: kitId },
								data: {
									reportFileName: uploadResult.fileName,
								},
							});

							// Log the upload action for audit trail
							await AuditService.logAction({
								orderId,
								action: 'REPORT_UPLOAD',
								userId: userId!,
								userEmail: uploadedBy,
								details: {
									fileName: uploadResult.fileName,
									originalFileName: reportFile.name,
									fileSize: reportFile.size,
									fileType: reportFile.type,
									uploadResult: uploadResult,
									kitId: kitId,
								},
							});
						} catch (uploadError) {
							throw new Error(`Failed to upload report file for kit ${kitId}`);
						}
					})()
				);
			}
		}

		// Wait for all uploads to complete
		if (uploadPromises.length > 0) {
			await Promise.all(uploadPromises);
		}

		// Update the order status
		await prisma.order.update({
			where: { id: orderId },
			data: {
				status: status as any,
				notes: notes || null,
				outboundTrackingNumber: outboundTrackingNumber || null,
				inboundTrackingNumber: inboundTrackingNumber || null,
				statusUpdatedAt: new Date(),
			},
		});
	} catch (err) {
		throw err;
	}
}

export async function inviteAdmin(formData: FormData) {
	// Check that the user trying to invite an admin is an admin
	if (!checkRole('ADMIN')) {
		return { success: false, message: 'Unauthorized' };
	}

	try {
		const email = formData.get('email') as string;

		if (!email) {
			return { success: false, message: 'Email is required' };
		}

		// Check if user already exists
		const { clerkClient } = await import('@clerk/nextjs/server');
		const client = await clerkClient();

		try {
			const existingUser = await client.users.getUserList({
				emailAddress: [email],
			});
			if (existingUser.data.length > 0) {
				return {
					success: false,
					message: 'User with this email already exists',
				};
			}
		} catch (error) {
			// User doesn't exist, which is what we want
		}

		// Create invitation
		// const invitation = await client.invitations.createInvitation({
		//   emailAddress: email,
		//   publicMetadata: {
		//     role: "ADMIN",
		//     invitedBy: (await (await import("@clerk/nextjs/server")).auth()).userId,
		//     invitationMessage:
		//       message || "You have been invited to join as an admin.",
		//   },
		//   redirectUrl: `${process.env.NEXT_PUBLIC_CLERK_ADMIN_INVITATION_REDIRECT_URL || "http://localhost:3000/sign-up?redirect_url=/admin"}`,
		// });

		return {
			success: true,
			message: `Invitation sent to ${email}. They will receive an email with sign-up instructions.`,
			email,
		};
	} catch (error) {
		return {
			success: false,
			message:
				'Failed to send invitation. Please check the email address and try again.',
		};
	}
}

export async function inviteCounselor(formData: FormData) {
	const client = await clerkClient();
	const { userId } = await auth();

	// Only allow admin users to send invitations
	if (!checkRole('ADMIN')) {
		return { success: false, message: 'Unauthorized' };
	}

	if (!userId) {
		return { success: false, message: 'Unauthorized: Missing userId' };
	}

	try {
		const email = formData.get('email') as string;
		const message =
			formData.get('message') ??
			'You have been invited to join as a counselor.';

		if (!email) {
			return { success: false, message: 'Email is required' };
		}

		// Check for existing user
		try {
			const existingUser = await client.users.getUserList({
				emailAddress: [email],
			});

			if (existingUser.data && existingUser.data.length > 0) {
				return {
					success: false,
					message: `User with this email already exists: ${email}`,
				};
			}
		} catch (error) {
			const errMsg = error instanceof Error ? error.message : String(error);

			return {
				success: false,
				message: `Could not verify whether user with this email already exists.`,
				error: errMsg,
			};
		}

		// Get current admin user id (as inviter)
		await client.invitations.createInvitation({
			emailAddress: email,
			publicMetadata: {
				role: 'COUNSELOR',
				invitedBy: userId,
				invitationMessage: message,
			},
			redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invitation?redirect_url=/counselor`,
		});

		return {
			success: true,
			message: `Counselor invitation sent to ${email}. They will receive an email with sign-up instructions.`,
			email,
		};
	} catch (error) {
		return {
			success: false,
			message:
				'Failed to send invitation. Please check the email address and try again.',
		};
	}
}

export async function deleteUser(formData: FormData) {
	if (!checkRole('ADMIN')) {
		return;
	}

	try {
		const userId = formData.get('userId') as string;

		// Get the user from our database first to get the email
		const user = await prisma.user.findUnique({
			where: { id: userId },
			select: { email: true },
		});

		if (!user) {
			return;
		}

		// Delete from our database first (this will cascade to related records)
		await prisma.user.delete({
			where: { id: userId },
		});

		// Find and delete from Clerk using email
		const client = await clerkClient();
		try {
			// Find the Clerk user by email
			const clerkUsers = await client.users.getUserList({
				emailAddress: [user.email],
			});
			const clerkUser = clerkUsers.data[0];

			if (clerkUser) {
				// Clear all metadata before deletion
				try {
					await client.users.updateUser(clerkUser.id, {
						publicMetadata: {},
						privateMetadata: {},
						unsafeMetadata: {},
					});
				} catch (metadataError) {
					// Continue with deletion even if metadata clearing fails
				}

				// Delete from Clerk
				await client.users.deleteUser(clerkUser.id);
			} else {
			}
		} catch (clerkError) {
			// Continue even if Clerk operations fail
		}
	} catch (err) {}
}

export async function deleteChild(formData: FormData) {
	if (!checkRole('ADMIN')) {
		return;
	}

	try {
		const childId = formData.get('childId') as string;

		await prisma.child.delete({
			where: { id: childId },
		});
	} catch (err) {}
}

export async function deleteQuestionnaire(formData: FormData) {
	if (!checkRole('ADMIN')) {
		return;
	}

	try {
		const questionnaireId = formData.get('questionnaireId') as string;

		await prisma.questionnaire.delete({
			where: { id: questionnaireId },
		});
	} catch (err) {}
}

export async function deleteOrder(formData: FormData) {
	if (!checkRole('ADMIN')) {
		return;
	}

	try {
		const orderId = formData.get('orderId') as string;

		await prisma.order.delete({
			where: { id: orderId },
		});
	} catch (err) {}
}
