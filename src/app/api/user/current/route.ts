import { auth, clerkClient } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function GET() {
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
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    // Get user data from database by email
    const dbUser = await prisma.user.findFirst({
      where: { email: userEmail },
      include: {
        profile: true,
        children: true,
        consents: {
          orderBy: { createdAt: 'desc' },
          take: 1
        },
        questionnaires: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      }
    });

    if (!dbUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Get latest order for the user
    const latestOrder = await prisma.order.findFirst({
      where: { userId: dbUser.id },
      orderBy: { createdAt: 'desc' }
    });

    return NextResponse.json({
      user: dbUser,
      order: latestOrder
    });
  } catch (error) {
    console.error('Error fetching current user:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
} 