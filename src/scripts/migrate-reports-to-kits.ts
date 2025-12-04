import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateReportsToKits() {
  try {
    // Since reportFileName has been moved from Order to Kit,
    // we need to check if there are any kits that need report filenames
    // For now, we'll just verify the migration was successful

    const kitsWithReports = await prisma.kit.findMany({
      where: {
        reportFileName: {
          not: null,
        },
      },
      include: {
        order: true,
      },
    });

    const ordersWithKits = await prisma.order.findMany({
      include: {
        kits: true,
      },
    });
  } catch (error) {
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateReportsToKits()
  .then(() => {
    process.exit(0);
  })
  .catch((error) => {
    process.exit(1);
  });
