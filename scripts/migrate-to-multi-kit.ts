import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Map order status to kit status
function mapOrderStatusToKitStatus(orderStatus: string): string {
  switch (orderStatus) {
    case 'ORDER_RECEIVED':
      return 'PENDING_ONBOARDING';
    case 'ONBOARDING_COMPLETED':
      return 'ONBOARDING_COMPLETED';
    case 'PREPARING_ORDER':
      return 'PREPARING_KIT';
    case 'SHIPPED_TO_USER':
      return 'SHIPPED_TO_USER';
    case 'DELIVERED_AWAITING_RETURN':
      return 'DELIVERED_AWAITING_RETURN';
    case 'SHIPPED_TO_LAB':
      return 'SHIPPED_TO_LAB';
    case 'RECEIVED_IN_PROCESS':
      return 'RECEIVED_IN_PROCESS';
    case 'COMPLETE_REPORT_DELIVERED':
      return 'COMPLETE_REPORT_DELIVERED';
    default:
      return 'PENDING_ONBOARDING';
  }
}

async function migrateExistingOrders() {
  console.log('Starting migration of existing orders to multi-kit structure...');

  try {
    // Get all existing orders with their related data
    const orders = await prisma.order.findMany({
      include: {
        user: {
          include: {
            children: true,
            consents: true,
            questionnaires: true
          }
        }
      }
    });

    console.log(`Found ${orders.length} orders to migrate`);

    for (const order of orders) {
      console.log(`Processing order ${order.orderNumber}...`);

      // Check if this order already has kits (already migrated)
      const existingKits = await prisma.kit.findMany({
        where: { orderId: order.id }
      });

      if (existingKits.length > 0) {
        console.log(`Order ${order.orderNumber} already has ${existingKits.length} kits, skipping...`);
        continue;
      }

      // Get the first child, consent, and questionnaire for this user
      const child = order.user.children[0];
      const consent = order.user.consents[0];
      const questionnaire = order.user.questionnaires[0];

      // Map order status to kit status
      const kitStatus = mapOrderStatusToKitStatus(order.status);

      // Create Kit for existing order
      const kit = await prisma.kit.create({
        data: {
          orderId: order.id,
          kitNumber: 1,
          kitType: 'BASE', // Default type for existing orders
          status: kitStatus as any,
          childId: child?.id,
          consentId: consent?.id,
          questionnaireId: questionnaire?.id,
        }
      });

      console.log(`Created ${kit.kitType} kit ${kit.id} for order ${order.orderNumber} with status ${kitStatus}`);
    }

    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration if this script is executed directly
if (require.main === module) {
  migrateExistingOrders()
    .then(() => {
      console.log('Migration script completed');
      process.exit(0);
    })
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateExistingOrders }; 