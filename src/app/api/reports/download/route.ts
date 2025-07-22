import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@clerk/nextjs/server';
import { prisma } from '@/lib/prisma';
import { reportStorageService } from '@/lib/report-storage';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { fileName } = await request.json();
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    // Get user email from Clerk
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    // Find the order that contains this report
    const order = await prisma.order.findFirst({
      where: { 
        reportFileName: fileName,
        user: { email: userEmail }
      }
    });

    if (!order) {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 });
    }

    // Generate a signed URL for the report
    const downloadUrl = await reportStorageService.getReportUrl(fileName);

    // Log the download action for audit trail
    const { AuditService } = await import('@/lib/audit-service');
    await AuditService.logAction({
      orderId: order.id,
      action: 'REPORT_DOWNLOAD',
      userId: userId,
      userEmail: userEmail,
      details: {
        fileName: fileName,
        downloadUrl: downloadUrl,
        orderNumber: order.orderNumber,
      },
    });

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
} 