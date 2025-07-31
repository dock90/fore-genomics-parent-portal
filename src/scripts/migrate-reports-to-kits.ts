import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function migrateReportsToKits() {
  console.log("Starting report filename migration...");

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

    console.log(`Found ${kitsWithReports.length} kits with report filenames`);

    const ordersWithKits = await prisma.order.findMany({
      include: {
        kits: true,
      },
    });

    console.log(`Total orders: ${ordersWithKits.length}`);

    for (const order of ordersWithKits) {
      console.log(`Order ${order.orderNumber}: ${order.kits.length} kits`);
      for (const kit of order.kits) {
        console.log(
          `  Kit ${kit.kitNumber}: ${kit.reportFileName || "No report"}`
        );
      }
    }

    console.log("Report filename migration verification completed!");
  } catch (error) {
    console.error("Error during migration:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

// Run the migration
migrateReportsToKits()
  .then(() => {
    console.log("Migration script completed");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Migration script failed:", error);
    process.exit(1);
  });
