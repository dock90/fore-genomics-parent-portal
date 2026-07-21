'use server';

import { checkRole } from '@/utils/roles';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import {
	ReportType,
	REPORT_TYPE_LABELS,
	REPORT_TYPE_DB_FIELDS,
} from '@/lib/report-types';
import { trackInviteSent } from '@/lib/klaviyo';
import { applyOrderStatusTransition } from '@/lib/order-status-service';
import type { OrderStatus } from '@prisma/client';

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
		// Silent update — when true, the status change is persisted (and audited) but
		// NO customer Klaviyo emails, admin notification email, or Slack post fire.
		// Used for back-office cleanup of stale/incorrect orders so customers don't
		// get "your test is moving" emails for an old order.
		const silent = formData.get('silent') === 'true';

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
							const message =
								uploadError instanceof Error
									? uploadError.message
									: 'Unknown error';
							throw new Error(
								`Failed to upload report for kit ${kitId}: ${message}`
							);
						}
					})()
				);
			}
		}

		// Wait for all uploads to complete
		if (uploadPromises.length > 0) {
			await Promise.all(uploadPromises);
		}

		// Resolve the acting admin's identity for the audit trail.
		const { userId: adminUserId } = await auth();
		let adminEmail = 'admin';
		if (adminUserId) {
			try {
				const client = await clerkClient();
				const adminUser = await client.users.getUser(adminUserId);
				adminEmail = adminUser.emailAddresses[0]?.emailAddress || 'admin';
			} catch {
				// fall back to 'admin' if the Clerk lookup fails
			}
		}

		// Persist the change and fire the audit log, Klaviyo events, admin
		// notification email, and Slack post. Shared with the FedEx tracking
		// automation (src/lib/fedex) so both paths behave identically.
		// See src/lib/order-status-service.ts.
		await applyOrderStatusTransition({
			orderId,
			status: status as OrderStatus,
			notes: notes || null,
			outboundTrackingNumber: outboundTrackingNumber || null,
			inboundTrackingNumber: inboundTrackingNumber || null,
			silent,
			actor: { userId: adminUserId ?? 'system', userEmail: adminEmail },
		});
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
			formData.get('message') ?? 'You have been invited to join as an admin.';

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
				message:
					'Could not verify whether user with this email already exists.',
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

/**
 * Manually send the Health Hub portal invite (Clerk invitation) to an order's
 * parent. Used for admin pre-filled accounts where the invite was intentionally
 * held until all info (signed TRF, child details, results) was added.
 */
export async function sendParentPortalInvite(formData: FormData) {
	if (!checkRole('ADMIN')) {
		return { success: false, message: 'Unauthorized' };
	}

	const orderId = formData.get('orderId') as string;
	if (!orderId) {
		return { success: false, message: 'Order ID is required' };
	}

	try {
		const order = await prisma.order.findUnique({
			where: { id: orderId },
			include: { parent: true },
		});

		if (!order || !order.parent) {
			return {
				success: false,
				message: 'Order or parent account not found.',
			};
		}

		const parent = order.parent;

		// If the parent already linked a Clerk account, they can already log in.
		if (parent.clerkId) {
			return {
				success: false,
				message:
					'This parent already has a portal login — no invite is needed.',
			};
		}

		const client = await clerkClient();
		const invitation = await client.invitations.createInvitation({
			emailAddress: parent.email,
			notify: true,
			ignoreExisting: true,
			publicMetadata: {
				role: 'PARENT',
				createdByAdmin: true,
				orderId: parent.id,
			},
			redirectUrl: process.env.NEXT_PUBLIC_CLERK_INVITATION_REDIRECT_URL,
		});

		// Klaviyo: Invite Sent — a held/pre-filled invite is now being sent, so enter
		// the parent into the Health Hub invite/onboarding reminder flow at this
		// point (with the activation URL) rather than at signup.
		await trackInviteSent({
			email: parent.email,
			orderId: order.id,
			orderNumber: order.orderNumber,
			inviteUrl: invitation.url,
		});

		// Audit trail
		try {
			const { userId: adminClerkId } = await auth();
			const adminEmail = adminClerkId
				? (await client.users.getUser(adminClerkId)).emailAddresses[0]
						?.emailAddress
				: undefined;
			await prisma.auditLog.create({
				data: {
					orderId,
					action: 'PARENT_PORTAL_INVITE_SENT',
					userId: null,
					userEmail: adminEmail ?? 'unknown',
					details: { parentEmail: parent.email },
				},
			});
		} catch {
			// Audit logging must never break the invite flow.
		}

		revalidatePath(`/admin/orders/${orderId}`);
		return {
			success: true,
			message: `Portal invite sent to ${parent.email}.`,
		};
	} catch (error: any) {
		const code = error?.errors?.[0]?.code;
		if (code === 'duplicate_record') {
			return {
				success: false,
				message: 'An invitation has already been sent to this email.',
			};
		}
		return {
			success: false,
			message: 'Failed to send portal invite. Please try again.',
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

/**
 * Step 1 of the direct-to-storage report upload.
 *
 * Returns a short-lived signed URL the browser uploads the file to directly.
 * This request carries no file body, so it stays well under Vercel's 4.5MB
 * serverless body limit (which `bodySizeLimit` cannot raise). Large reports that
 * used to fail silently — surfacing as "Cannot read properties of undefined
 * (reading 'success')" — now bypass the server entirely.
 */
export async function createReportUploadUrl(
	formData: FormData
): Promise<
	| { success: true; uploadUrl: string; fileName: string; contentType: string }
	| { success: false; message: string }
> {
	if (!(await checkRole('ADMIN'))) {
		return { success: false, message: 'Unauthorized' };
	}

	try {
		const orderId = formData.get('orderId') as string;
		const kitId = formData.get('kitId') as string;
		const reportType = (formData.get('reportType') as ReportType) || 'legacy';
		const fileName = formData.get('fileName') as string;
		const contentType =
			(formData.get('contentType') as string) || 'application/octet-stream';

		if (!orderId || !kitId) {
			return { success: false, message: 'Missing order or kit reference' };
		}
		if (!fileName) {
			return { success: false, message: 'No file provided' };
		}

		const { reportStorageService } = await import('@/lib/report-storage');
		const result = await reportStorageService.createReportUploadUrl(
			orderId,
			kitId,
			fileName,
			contentType,
			reportType
		);

		return {
			success: true,
			uploadUrl: result.uploadUrl,
			fileName: result.fileName,
			contentType: result.contentType,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return { success: false, message: `Failed to prepare upload: ${message}` };
	}
}

/**
 * Step 2 of the direct-to-storage report upload.
 *
 * After the browser has PUT the file to GCS, record the stored filename against
 * the kit and write the audit log. No file body — just metadata.
 */
export async function finalizeReportUpload(
	formData: FormData
): Promise<
	| { success: true; message: string; fileName: string }
	| { success: false; message: string }
> {
	if (!(await checkRole('ADMIN'))) {
		return { success: false, message: 'Unauthorized' };
	}

	try {
		const orderId = formData.get('orderId') as string;
		const kitId = formData.get('kitId') as string;
		const reportType = (formData.get('reportType') as ReportType) || 'legacy';
		const fileName = formData.get('fileName') as string;
		const originalFileName =
			(formData.get('originalFileName') as string) || fileName;
		const fileSize = Number(formData.get('fileSize') || 0);
		const fileType = (formData.get('fileType') as string) || '';

		if (!kitId || !fileName) {
			return { success: false, message: 'Missing upload reference' };
		}

		const { AuditService } = await import('@/lib/audit-service');

		const { userId } = await auth();
		const client = await clerkClient();
		const adminUser = await client.users.getUser(userId!);
		const uploadedBy = adminUser.emailAddresses[0]?.emailAddress || 'admin';

		// Update the specific kit with the report based on type
		const dbField = REPORT_TYPE_DB_FIELDS[reportType];
		await prisma.kit.update({
			where: { id: kitId },
			data: {
				[dbField]: fileName,
			},
		});

		await AuditService.logAction({
			orderId,
			action: 'REPORT_UPLOAD',
			userId: userId!,
			userEmail: uploadedBy,
			details: {
				fileName,
				originalFileName,
				fileSize,
				fileType,
				kitId,
				reportType,
				uploadMethod: 'direct-gcs',
			},
		});

		return {
			success: true,
			message: `${REPORT_TYPE_LABELS[reportType]} successfully uploaded and saved to order`,
			fileName,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return { success: false, message: `Failed to save report: ${message}` };
	}
}

export async function deleteKitReport(formData: FormData) {
	if (!checkRole('ADMIN')) {
		return { success: false, message: 'Unauthorized' };
	}

	try {
		const orderId = formData.get('orderId') as string;
		const kitId = formData.get('kitId') as string;
		const reportType = (formData.get('reportType') as ReportType) || 'legacy';

		const { reportStorageService } = await import('@/lib/report-storage');
		const { AuditService } = await import('@/lib/audit-service');
		const { userId } = await auth();
		const client = await clerkClient();
		const adminUser = await client.users.getUser(userId!);
		const deletedBy = adminUser.emailAddresses[0]?.emailAddress || 'admin';

		const dbField = REPORT_TYPE_DB_FIELDS[reportType];
		const kit = await prisma.kit.findUnique({
			where: { id: kitId },
			select: { [dbField]: true },
		});
		const fileName = (kit?.[dbField as keyof typeof kit] ?? null) as
			| string
			| null;

		if (fileName) {
			await reportStorageService.deleteReport(fileName);
		}

		await prisma.kit.update({
			where: { id: kitId },
			data: { [dbField]: null },
		});

		await AuditService.logAction({
			orderId,
			action: 'REPORT_DELETE',
			userId: userId!,
			userEmail: deletedBy,
			details: { fileName, kitId, reportType },
		});

		return { success: true, message: 'Report deleted' };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return { success: false, message: `Failed to delete report: ${message}` };
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
		return {
			success: false,
			message: `Failed to upload signed TRF / Consent: ${message}`,
		};
	}
}

/* ---------------------------------------------------------------------------
 * Genome (VCF) upload — powers Fore Explore.
 *
 * Same two-step direct-to-GCS pattern as report uploads: whole-genome VCFs are
 * far larger than any serverless body limit, so the browser PUTs straight to
 * the genome bucket with a one-time signed URL, then we record the filename on
 * `Kit.genomeDataFileName`. That field is the per-kit gate for Explore — the
 * parent's "Explore <child>'s genome" CTA and the Explore app itself unlock
 * the moment it is set (order status permitting).
 * ------------------------------------------------------------------------- */

export async function createGenomeUploadUrl(
	formData: FormData
): Promise<
	| { success: true; uploadUrl: string; fileName: string; contentType: string }
	| { success: false; message: string }
> {
	if (!(await checkRole('ADMIN'))) {
		return { success: false, message: 'Unauthorized' };
	}

	try {
		const kitId = formData.get('kitId') as string;
		const fileName = formData.get('fileName') as string;
		const contentType =
			(formData.get('contentType') as string) || 'application/gzip';

		if (!kitId) {
			return { success: false, message: 'Missing kit reference' };
		}
		if (!fileName) {
			return { success: false, message: 'No file provided' };
		}
		const lower = fileName.toLowerCase();
		if (!lower.endsWith('.vcf') && !lower.endsWith('.vcf.gz')) {
			return {
				success: false,
				message: 'Genome file must be a .vcf or .vcf.gz',
			};
		}

		const { genomeStorageService } = await import('@/lib/genome-storage');
		const result = await genomeStorageService.createGenomeUploadUrl(
			kitId,
			fileName,
			contentType
		);

		return {
			success: true,
			uploadUrl: result.uploadUrl,
			fileName: result.fileName,
			contentType: result.contentType,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return {
			success: false,
			message: `Failed to prepare genome upload: ${message}`,
		};
	}
}

export async function finalizeGenomeUpload(
	formData: FormData
): Promise<
	| { success: true; message: string; fileName: string }
	| { success: false; message: string }
> {
	if (!(await checkRole('ADMIN'))) {
		return { success: false, message: 'Unauthorized' };
	}

	try {
		const orderId = formData.get('orderId') as string;
		const kitId = formData.get('kitId') as string;
		const fileName = formData.get('fileName') as string;
		const originalFileName =
			(formData.get('originalFileName') as string) || fileName;
		const fileSize = Number(formData.get('fileSize') || 0);

		if (!kitId || !fileName) {
			return { success: false, message: 'Missing upload reference' };
		}

		const { AuditService } = await import('@/lib/audit-service');

		const { userId } = await auth();
		const client = await clerkClient();
		const adminUser = await client.users.getUser(userId!);
		const uploadedBy = adminUser.emailAddresses[0]?.emailAddress || 'admin';

		await prisma.kit.update({
			where: { id: kitId },
			data: { genomeDataFileName: fileName },
		});

		await AuditService.logAction({
			orderId,
			action: 'GENOME_UPLOAD',
			userId: userId!,
			userEmail: uploadedBy,
			details: {
				fileName,
				originalFileName,
				fileSize,
				kitId,
				uploadMethod: 'direct-gcs',
			},
		});

		return {
			success: true,
			message:
				'Genome linked to kit — Fore Explore is now unlocked for this child',
			fileName,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return { success: false, message: `Failed to save genome: ${message}` };
	}
}

export async function deleteKitGenome(formData: FormData) {
	if (!(await checkRole('ADMIN'))) {
		return { success: false, message: 'Unauthorized' };
	}

	try {
		const orderId = formData.get('orderId') as string;
		const kitId = formData.get('kitId') as string;

		const { genomeStorageService } = await import('@/lib/genome-storage');
		const { AuditService } = await import('@/lib/audit-service');
		const { userId } = await auth();
		const client = await clerkClient();
		const adminUser = await client.users.getUser(userId!);
		const deletedBy = adminUser.emailAddresses[0]?.emailAddress || 'admin';

		const kit = await prisma.kit.findUnique({
			where: { id: kitId },
			select: { genomeDataFileName: true },
		});
		const fileName = kit?.genomeDataFileName ?? null;

		if (fileName) {
			try {
				await genomeStorageService.deleteGenome(fileName);
			} catch {
				// Object may already be gone — still clear the DB pointer below.
			}
		}

		await prisma.kit.update({
			where: { id: kitId },
			data: { genomeDataFileName: null },
		});

		await AuditService.logAction({
			orderId,
			action: 'GENOME_DELETE',
			userId: userId!,
			userEmail: deletedBy,
			details: { fileName, kitId },
		});

		return { success: true, message: 'Genome removed' };
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return { success: false, message: `Failed to delete genome: ${message}` };
	}
}
