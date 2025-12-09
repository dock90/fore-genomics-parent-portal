const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();

async function main() {
  const email = "kyle@foregenomics.com";

  // Check if admin user already exists
  const existingAdmin = await prisma.user.findUnique({
    where: { email },
  });

  if (existingAdmin) {
    return;
  }

  // Create admin user
  try {
    const adminUser = await prisma.user.create({
      data: {
        email,
        role: "ADMIN",
      },
    });
  } catch (e) {
    throw e;
  }
}

main()
  .catch((e) => {
    console.error("❌ Error during seeding:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
