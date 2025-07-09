const { PrismaClient } = require('../src/generated/prisma');

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting database seeding...');
  const email = 'adam.land@gmail.com';

  // Check if admin user already exists
  console.log(`🔍 Checking for existing admin user: ${email}`);
  const existingAdmin = await prisma.user.findUnique({
    where: { email }
  });

  if (existingAdmin) {
    console.log('✅ Admin user already exists:', existingAdmin.email);
    console.log('📝 Note: You may need to set up Clerk metadata manually');
    console.log('   - Sign in with adam.land@gmail.com');
    console.log('   - Call POST /api/admin/setup to set role in Clerk');
    return;
  }

  // Create admin user
  console.log('🚀 Creating admin user...');
  try {
    const adminUser = await prisma.user.create({
      data: {
        email,
        role: 'ADMIN',
        preTestCounselingScheduled: false,
        postTestCounselingScheduled: false,
      }
    });
    console.log('✅ Admin user created:', adminUser.email);
    console.log('✅ Role:', adminUser.role);
    console.log('📝 Next steps:');
    console.log('   1. Sign in with adam.land@gmail.com');
    console.log('   2. Call POST /api/admin/setup to set role in Clerk');
  } catch (e) {
    console.error('❌ Failed to create admin user:', e);
    throw e;
  }

  console.log('🎉 Database seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('❌ Error during seeding:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  }); 