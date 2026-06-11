'use server';

import { checkRole } from '@/utils/roles';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { ReportType, REPORT_TYPE_LABELS, REPORT_TYPE_DB_FIELDS } from '@/lib/report-types';
import { trackKitShipped, trackKitDelivered, trackSampleReady, trackResultsReady } from '@/lib/klaviyo';
import { emailService } from '@/lib/email-service';

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
						const message = uploadError instanceof Error ? uploadError.message : 'Unknown error';
						throw new Error(`Failed to upload report for kit ${kitId}: ${message}`);
					}
					})()
				);
			}
		}

		// Wait for all uploads to complete
		if (uploadPromises.length > 0) {
			await Promise.all(uploadPromises);
		}

		// Snapshot current order state before update — needed to decide which Klaviyo events to fire
		const previousOrder = await prisma.order.findUnique({
			where: { id: orderId },
			select: { status: true, outboundTrackingNumber: true },
		});

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

		// Klaviyo events + admin notifications — fire based on new status
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			include: { parent: true, purchaser: true },
		});

		const email = order?.parent?.email ?? order?.purchaser?.email;

		if (email && order) {
			// Kit Shipped — only fire when a tracking number is present.
			// Fires when: (a) status just moved to SHIPPED_TO_USER with a tracking number, OR
			//             (b) tracking number is newly added to an already-shipped order.
			// Never fires without a tracking number — would send a blank link in the email flow.
			const trackingPresent = !!outboundTrackingNumber;
			const statusChangedToShipped = status === 'SHIPPED_TO_USER' && previousOrder?.status !== 'SHIPPED_TO_USER';
			const trackingAddedWhileShipped = status === 'SHIPPED_TO_USER'
				&& previousOrder?.status === 'SHIPPED_TO_USER'
				&& !previousOrder?.outboundTrackingNumber
				&& trackingPresent;

			if (trackingPresent && (statusChangedToShipped || trackingAddedWhileShipped)) {
				await trackKitShipped({
					email,
					orderId: order.id,
					orderNumber: order.orderNumber,
					trackingNumber: outboundTrackingNumber,
				});
			}

			if (status === 'DELIVERED_AWAITING_RETURN' && previousOrder?.status !== 'DELIVERED_AWAITING_RETURN') {
				await trackKitDelivered({
					email,
					orderId: order.id,
					orderNumber: order.orderNumber,
				});
			}

			if (status === 'RECEIVED_IN_PROCESS' && previousOrder?.status !== 'RECEIVED_IN_PROCESS') {
				await trackSampleReady({
					email,
					orderId: order.id,
					orderNumber: order.orderNumber,
				});
			}

			if (status === 'COMPLETE_REPORT_DELIVERED' && previousOrder?.status !== 'COMPLETE_REPORT_DELIVERED') {
				await trackResultsReady({
					email,
					orderId: order.id,
					orderNumber: order.orderNumber,
				});
			}

			// Admin status change notification — fires on every status update
			const STATUS_LABELS: Record<string, string> = {
				ORDER_RECEIVED: 'Order Received',
				ONBOARDING_COMPLETED: 'Onboarding Completed',
				PREPARING_ORDER: 'Preparing Order',
				SHIPPED_TO_USER: 'Kit Shipped to Customer',
				DELIVERED_AWAITING_RETURN: 'Delivered — Awaiting Return',
				SHIPPED_TO_LAB: 'Shipped to Lab',
				RECEIVED_IN_PROCESS: 'Received / In Process',
				COMPLETE_REPORT_DELIVERED: 'Complete — Report Delivered',
				COMPLETE_NO_COUNSELING_REQUIRED: 'Complete — No Counseling Required',
			};

			await emailService.sendAdminStatusChangeNotification({
				orderNumber: order.orderNumber,
				parentEmail: email,
				newStatus: status,
				statusLabel: STATUS_LABELS[status] ?? status,
				changedAt: new Date(),
				notes: notes || undefined,
			});
		}
	} catch (err) {
		throw err;
	}
}

export async function inviteAdmin(formData: FormData) {
	const client = await clerkClient();
	const { userId } = await auth();

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
			'You have been invited to join as an admin.';

		if (!email) {
			return { success: false, message: 'Email is required' };
		}

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
				message: 'Could not verify whether user with this email already exists.',
				error: errMsg,
			};
		}

		await client.invitations.createInvitation({
			emailAddress: email,
			publicMetadata: {
				role: 'ADMIN',
				invitedBy: userId,
				invitationMessage: message,
			},
			redirectUrl: `${process.env.NEXT_PUBLIC_APP_URL}/invitation?redirect_url=/admin`,
		});

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


export async function uploadKitReport(formData: FormData) {
	// Check that the user is an admin
	if (!checkRole('ADMIN')) {
		return { success: false, message: 'Unauthorized' };
	}

	try {
		const orderId = formData.get('orderId') as string;
		const kitId = formData.get('kitId') as string;
		const reportFile = formData.get('reportFile') as File;
		const reportType = (formData.get('reportType') as ReportType) || 'legacy';

		if (!reportFile || reportFile.size === 0) {
			return { success: false, message: 'No file provided' };
		}

		const maxSize = 50 * 1024 * 1024; // 50 MB
		if (reportFile.size > maxSize) {
			return {
				success: false,
				message: `File size exceeds 50 MB limit. Size: ${(reportFile.size / 1024 / 1024).toFixed(2)} MB`,
			};
		}

		const { reportStorageService } = await import('@/lib/report-storage');
		const { AuditService } = await import('@/lib/audit-service');

		// Get admin user info for upload tracking
		const { userId } = await auth();
		const client = await clerkClient();
		const adminUser = await client.users.getUser(userId!);
		const uploadedBy = adminUser.emailAddresses[0]?.emailAddress || 'admin';

		const uploadResult = await reportStorageService.uploadReport(
			orderId,
			kitId,
			reportFile,
			uploadedBy,
			reportType
		);

		// Update the specific kit with the report based on type
		const dbField = REPORT_TYPE_DB_FIELDS[reportType];
		await prisma.kit.update({
			where: { id: kitId },
			data: {
				[dbField]: uploadResult.fileName,
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
				reportType: reportType,
			},
		});

		return {
			success: true,
			message: `${REPORT_TYPE_LABELS[reportType]} successfully uploaded and saved to order`,
			fileName: uploadResult.fileName,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return { success: false, message: `Failed to upload report: ${message}` };
	}
}

export async function uploadSignedTRFConsent(formData: FormData) {
	if (!checkRole('ADMIN')) {
		return { success: false, message: 'Unauthorized' };
	}

	try {
		const kitId = formData.get('kitId') as string;
		const file = formData.get('file') as File;

		if (!file || file.size === 0) {
			return { success: false, message: 'No file provided' };
		}

		const maxSize = 50 * 1024 * 1024;
		if (file.size > maxSize) {
			return {
				success: false,
				message: `File size exceeds 50 MB limit. Size: ${(file.size / 1024 / 1024).toFixed(2)} MB`,
			};
		}

		const kit = await prisma.kit.findUnique({
			where: { id: kitId },
			include: { order: true },
		});

		if (!kit) {
			return { success: false, message: 'Kit not found' };
		}

		const { googleStorageService } = await import('@/lib/google-storage');
		const { AuditService } = await import('@/lib/audit-service');

		const { userId } = await auth();
		const client = await clerkClient();
		const adminUser = await client.users.getUser(userId!);
		const uploadedBy = adminUser.emailAddresses[0]?.emailAddress || 'admin';

		const uploadResult = await googleStorageService.uploadApprovedTRF(
			kit.order.orderNumber,
			kit.kitNumber,
			file,
			uploadedBy
		);

		await prisma.kit.update({
			where: { id: kitId },
			data: {
				trfApprovedFileName: uploadResult.fileName,
				trfApproved: true,
				trfApprovedAt: new Date(),
				trfApprovedBy: uploadedBy,
			},
		});

		await AuditService.logAction({
			orderId: kit.orderId,
			action: 'SIGNED_TRF_CONSENT_UPLOAD',
			userId: userId!,
			userEmail: uploadedBy,
			details: {
				kitId: kit.id,
				kitNumber: kit.kitNumber,
				orderNumber: kit.order.orderNumber,
				fileName: uploadResult.fileName,
				originalFileName: file.name,
				fileSize: file.size,
			},
		});

		return {
			success: true,
			message: 'Signed TRF / Consent uploaded successfully',
			fileName: uploadResult.fileName,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return { success: false, message: `Failed to upload signed TRF / Consent: ${message}` };
	}
}
