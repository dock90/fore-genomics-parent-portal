import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { createLogger } from '@/lib/logger';

const log = createLogger('OnboardingSave');

export async function POST(request: Request) {
	try {
		const { userId } = await auth();

		if (!userId) {
			return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
		}

		// Get user email from Clerk
		const client = await clerkClient();
		const clerkUser = await client.users.getUser(userId);
		const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

		if (!userEmail) {
			return NextResponse.json({ error: 'No email found' }, { status: 400 });
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
			childEthnicityOther,
			relationshipToChild,
			invitedParent,
			consent,
			questionnaire,
			orderId,
			selectedKitId,
		} = body;

		// Find the user in the database
		const dbUser = await prisma.user.findFirst({
			where: { email: userEmail },
			include: {
				profile: true,
				parentOrders: {
					include: { kits: true },
				},
				purchaserOrders: {
					include: { kits: true },
				},
			},
		});

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

		// Get the order
		const order =
			dbUser.parentOrders.find((o) => o.id === orderId) ||
			dbUser.purchaserOrders.find((o) => o.id === orderId) ||
			dbUser.parentOrders[0] ||
			dbUser.purchaserOrders[0];

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
					// Map our field names to the database field names
					question1: questionnaire.milestonesOnTime ?? false,
					question1Details: questionnaire.milestonesDetails || '',
					question2: questionnaire.familyHistoryExists ?? false,
					question2Details: questionnaire.familyHistoryDetails || '',
					question3: questionnaire.hospitalizationHistory ?? false,
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
