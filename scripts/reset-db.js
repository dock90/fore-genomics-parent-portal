const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

// Extract database user from DATABASE_URL
function getDatabaseUser() {
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // Parse DATABASE_URL to extract username
  // Format: postgres://username:password@host:port/database or postgresql://username:password@host:port/database
  const match = databaseUrl.match(/postgres(?:ql)?:\/\/([^:]+):[^@]+@[^\/]+\/[^?]+/);
  if (!match) {
    throw new Error('Could not parse DATABASE_URL');
  }
  
  return match[1];
}

async function resetDatabase() {
  try {
    console.log('🔄 Starting database reset...');

    // Get the database user from the connection string
    const dbUser = getDatabaseUser();
    console.log(`👤 Using database user: ${dbUser}`);

    // Drop all tables (this will cascade and remove all data)
    console.log('🗑️  Dropping all tables...');
    await prisma.$executeRaw`DROP SCHEMA IF EXISTS public CASCADE`;
    await prisma.$executeRaw`CREATE SCHEMA public`;
    await prisma.$executeRawUnsafe(`GRANT ALL ON SCHEMA public TO ${dbUser}`);
    await prisma.$executeRaw`GRANT ALL ON SCHEMA public TO public`;

    console.log('✅ All tables dropped successfully');

    // Run migrations to recreate tables
    console.log('🔄 Running migrations...');
    const { execSync } = require('child_process');
    execSync('npx prisma migrate deploy', { stdio: 'inherit' });

    console.log('✅ Migrations completed');

    // Create admin user
    console.log('👤 Creating admin user...');
    const adminUser = await prisma.user.create({
      data: {
        email: 'adam.land@gmail.com',
        role: 'ADMIN',
      }
    });

    console.log('✅ Admin user created:', adminUser.email);

    // Create user profile for admin
    console.log('📝 Creating admin profile...');
    const adminProfile = await prisma.userProfile.create({
      data: {
        userId: adminUser.id,
        firstName: 'Adam',
        lastName: 'Land',
        address: '123 Admin Street',
        city: 'Admin City',
        state: 'CA',
        zipCode: '90210',
        phone: '(555) 123-4567',
      }
    });

    console.log('✅ Admin profile created');

    console.log('\n🎉 Database reset completed successfully!');
    console.log('📊 Database now contains:');
    console.log('   - Admin user: adam.land@gmail.com');
    console.log('   - All tables recreated with latest schema');
    console.log('   - Ready for development');

  } catch (error) {
    console.error('❌ Error resetting database:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the reset
resetDatabase(); 