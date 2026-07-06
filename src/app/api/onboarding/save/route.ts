import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createLogger } from '@/lib/logger';
import { getDbUser } from '@/lib/user-service';
import { prisma } from '@/lib/prisma';
import { trackOnboardingCompleted } from '@/lib/klaviyo';

const log = createLogger('OnboardingSave');

export async function POST(request: Request) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		const body = await request.json();
		const {
			firstName,
			lastName,
			address,
			phone,
			communicationPreference,
			childIsUnborn,
			childFirstName,
			childLastName,
			childDob,
			childDueDate,
			childSex,
			childEthnicity,
			relationshipToChild,
			invitedParent,
			consent,
			questionnaire,
			orderId,
			selectedKitId,
		} = body;

	// Get database user - uses clerkId internally but returns user with database ID
	const dbUser = await getDbUser(userId);

	if (!dbUser) {
		return NextResponse.json({ error: 'User not found' }, { status: 404 });
	}

	// Update or create user profile
	await prisma.userProfile.upsert({
		where: { userId: dbUser.id },
		update: {
			firstName,
			lastName,
			address: address?.street || '',
			addressLine2: address?.street2 || null,
			city: address?.city || '',
			state: address?.state || '',
			zipCode: address?.zipCode || '',
			phone: phone || '',
			communicationPreference: communicationPreference || 'EMAIL',
		},
		create: {
			userId: dbUser.id,
			firstName,
			lastName,
			address: address?.street || '',
			addressLine2: address?.street2 || null,
			city: address?.city || '',
			state: address?.state || '',
			zipCode: address?.zipCode || '',
			phone: phone || '',
			communicationPreference: communicationPreference || 'EMAIL',
		},
	});

	// Get the order directly - either by ID or find the user's first order
	const order = orderId
		? await prisma.order.findFirst({
				where: {
					id: orderId,
					OR: [{ parentId: dbUser.id }, { purchaserId: dbUser.id }],
				},
				include: { kits: true },
		  })
		: await prisma.order.findFirst({
				where: {
					OR: [{ parentId: dbUser.id }, { purchaserId: dbUser.id }],
				},
				include: { kits: true },
				orderBy: { createdAt: 'desc' },
		  });

	if (!order) {
		return NextResponse.json({ error: 'No order found' }, { status: 404 });
	}

	// Get the kit to update
	const kit = selectedKitId
		? order.kits.find((k) => k.id === selectedKitId)
		: order.kits[0];

		if (!kit) {
			return NextResponse.json({ error: 'No kit found' }, { status: 404 });
		}

		// For unborn child flow - just save due date and basic info
		if (childIsUnborn) {
			// Create child record with due date only
			const child = await prisma.child.create({
				data: {
					userId: dbUser.id,
					dueDate: childDueDate || null,
					// Leave name and other fields empty for unborn
				},
			});

			// Link child to kit
			await prisma.kit.update({
				where: { id: kit.id },
				data: { childId: child.id },
			});

			// Keep order status as ORDER_RECEIVED for unborn - dashboard will show unborn view
			// Status will be updated when they complete onboarding after birth

			return NextResponse.json({
				success: true,
				message: 'Unborn child information saved',
				childId: child.id,
			});
		}

		// For regular (born child) flow - save everything
		// Create child record
		const child = await prisma.child.create({
			data: {
				userId: dbUser.id,
				firstName: childFirstName,
				lastName: childLastName,
				dob: childDob || null,
				sex: childSex || null,
				ethnicities: childEthnicity || [],
			},
		});

		// Link child to kit
		await prisma.kit.update({
			where: { id: kit.id },
			data: { childId: child.id },
		});

		// If relationship is OTHER and invitedParent exists, create invitation
		if (relationshipToChild === 'OTHER' && invitedParent) {
			await prisma.parentInvitation.create({
				data: {
					orderId: order.id,
					expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days
					status: 'PENDING',
				},
			});

			// Keep order at ORDER_RECEIVED until parent completes consent

			return NextResponse.json({
				success: true,
				message: 'Parent invitation created',
				childId: child.id,
			});
		}

		// Create consent record
		let consentRecord = null;
		if (consent && consent.consentAll && consent.signature) {
			consentRecord = await prisma.consent.create({
				data: {
					userId: dbUser.id,
					childId: child.id,
					accepted: consent.consentAll,
					part1Accepted: consent.part1Accepted,
					part2Accepted: consent.part2Accepted,
					part3Accepted: consent.part3Accepted,
					consentAll: consent.consentAll,
					signature: consent.signature,
					signerName: consent.signerName || `${firstName} ${lastName}`,
					signatureDate: new Date(),
					relationshipToChild: relationshipToChild || 'PARENT',
				},
			});

			// Link consent to kit
			await prisma.kit.update({
				where: { id: kit.id },
				data: { consentId: consentRecord.id },
			});
		}

		// Create questionnaire record
		let questionnaireRecord = null;
		if (questionnaire) {
			questionnaireRecord = await prisma.questionnaire.create({
				data: {
					userId: dbUser.id,
					question1: String(questionnaire.milestonesOnTime ?? false),
					question1Details: questionnaire.milestonesDetails || '',
					question2: String(questionnaire.familyHistoryExists ?? false),
					question2Details: questionnaire.familyHistoryDetails || '',
					question3: String(questionnaire.hospitalizationHistory ?? false),
					question3Details: questionnaire.hospitalizationDetails || '',
				},
			});

			// Link questionnaire to kit
			await prisma.kit.update({
				where: { id: kit.id },
				data: { questionnaireId: questionnaireRecord.id },
			});
		}

		// Update order status to onboarding completed
		await prisma.order.update({
			where: { id: order.id },
			data: { status: 'ONBOARDING_COMPLETED' },
		});

		// Klaviyo: fire Onboarding Completed — this is the "Enrollment Completed"
		// signal Suzanne can trigger the next flow off of, and it's also the exit/goal
		// event for the "Enrollment Pending" nudge flow started at signup.
		await trackOnboardingCompleted({
			email: dbUser.email,
			orderId: order.id,
			orderNumber: order.orderNumber,
		});

		return NextResponse.json({
			success: true,
			message: 'Onboarding completed',
			childId: child.id,
			consentId: consentRecord?.id,
			questionnaireId: questionnaireRecord?.id,
		});
	} catch (error) {
		log.error('Error saving onboarding data', error);
		return NextResponse.json(
			{ error: 'Failed to save onboarding data' },
			{ status: 500 }
		);
	}
}
