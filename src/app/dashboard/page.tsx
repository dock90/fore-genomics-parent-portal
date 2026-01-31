import { auth } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { getDbUser } from '@/lib/user-service';
import { prisma } from '@/lib/prisma';
import DashboardContent from '@/components/DashboardContent';
import PurchaserDashboard from '@/components/PurchaserDashboard';
import DashboardFooter from '@/components/DashboardFooter';

export default async function DashboardPage() {
	const { userId, sessionClaims } = await auth();

	if (!userId) {
		redirect('/sign-in');
	}

	// Check if user is an admin and redirect to admin dashboard
	if ((sessionClaims?.metadata as any)?.role === 'ADMIN') {
		redirect('/admin');
	}

	// Check if user is a counselor and redirect to counselor dashboard
	if ((sessionClaims?.metadata as any)?.role === 'COUNSELOR') {
		redirect('/counselor');
	}

	// Get database user - uses clerkId internally but returns user with database ID
	const dbUser = await getDbUser(userId);

	// If user doesn't exist in database, redirect to onboarding
	if (!dbUser) {
		redirect('/onboarding');
	}

	// Query related data directly for proper typing
	const [profile, children] = await Promise.all([
		prisma.userProfile.findUnique({ where: { userId: dbUser.id } }),
		prisma.child.findMany({ where: { userId: dbUser.id } }),
	]);

	// Get the appropriate orders based on user role
	const userOrders = await prisma.order.findMany({
		where:
			dbUser.role === 'PARENT'
				? { parentId: dbUser.id }
				: { purchaserId: dbUser.id },
		orderBy: { createdAt: 'desc' },
	});

	// Check if user has completed onboarding by checking order status
	if (userOrders.length > 0) {
		// First check if user has an unborn child - they should NOT be redirected
		const hasUnbornChild = children.some(
			(child) => child.dueDate && !child.firstName && !child.lastName
		);

		// Check for any orders that need onboarding completion
		// Skip this check if user has unborn child (they completed unborn flow)
		if (!hasUnbornChild) {
			const ordersNeedingOnboarding = userOrders.filter(
				(order) => order.status === 'ORDER_RECEIVED'
			);

			if (ordersNeedingOnboarding.length > 0) {
				redirect('/onboarding');
			}
		}

		// For multi-kit orders, check if all kits have completed onboarding
		for (const order of userOrders) {
			if (order.kitCount > 1) {
				const kits = await prisma.kit.findMany({
					where: { orderId: order.id },
					include: {
						child: true,
						consent: true,
						questionnaire: true,
					},
				});

				// Check if this order has an unborn child
				const hasUnbornChild = kits.some(
					(kit) =>
						kit.child &&
						kit.child.dueDate &&
						!kit.child.firstName &&
						!kit.child.lastName
				);

				if (hasUnbornChild) {
					// For unborn child orders, only require childId (dueDate is set during onboarding)
					const incompleteKits = kits.filter((kit) => !kit.childId);
					if (incompleteKits.length > 0) {
						redirect('/onboarding');
					}
				} else {
					// For regular orders, require all associations
					const incompleteKits = kits.filter(
						(kit) => !kit.childId || !kit.consentId || !kit.questionnaireId
					);
					if (incompleteKits.length > 0) {
						redirect('/onboarding');
					}
				}
			}
		}
	} else {
		// If user has no orders, redirect to onboarding
		redirect('/onboarding');
	}

	// Get all orders for the user based on their role
	const orderWhere =
		dbUser.role === 'ADMIN'
			? {}
			: dbUser.role === 'PARENT'
				? { parentId: dbUser.id }
				: {
						OR: [{ purchaserId: dbUser.id }, { parentId: dbUser.id }],
					};

	const allOrders = await prisma.order.findMany({
		where: orderWhere,
		orderBy: { createdAt: 'desc' },
		include: {
			kits: {
				include: {
					child: true,
					consent: true,
					questionnaire: true,
				},
			},
		},
	});

	// Construct user object with profile and children for components
	const userWithChildren = { ...dbUser, profile, children };

	// Determine which dashboard to show based on user role
	if (dbUser.role === 'PURCHASER') {
		return (
			<div className="p-4 sm:p-6 lg:p-8">
				<PurchaserDashboard user={userWithChildren} orders={allOrders} />
				<DashboardFooter />
			</div>
		);
	}

	return (
		<div className="p-4 sm:p-6 lg:p-8">
			<DashboardContent user={userWithChildren} orders={allOrders} />
			<DashboardFooter />
		</div>
	);
}
