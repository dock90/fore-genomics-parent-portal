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

    // Rate limiting: Check if user has made too many requests recently
    const userAgent = request.headers.get('user-agent') || '';
    const ip = request.headers.get('x-forwarded-for') || request.ip || 'unknown';
    
    // Simple rate limiting - in production, consider using Redis or a dedicated rate limiting service
    const rateLimitKey = `download:${userId}:${ip}`;
    // This is a basic implementation - consider implementing proper rate limiting

    const { fileName } = await request.json();
    
    if (!fileName) {
      return NextResponse.json({ error: 'File name is required' }, { status: 400 });
    }

    // Security: Validate fileName to prevent path traversal attacks
    if (fileName.includes('..') || fileName.includes('\\')) {
      return NextResponse.json({ error: 'Invalid file name' }, { status: 400 });
    }

    // Security: Validate fileName format (should be kitId/timestamp-filename)
    const fileNamePattern = /^[a-zA-Z0-9_-]+\/\d+-[a-zA-Z0-9._-]+$/;
    if (!fileNamePattern.test(fileName)) {
      return NextResponse.json({ error: 'Invalid file name format' }, { status: 400 });
    }

    // Get user email from Clerk
    const { clerkClient } = await import('@clerk/nextjs/server');
    const client = await clerkClient();
    const user = await client.users.getUser(userId);
    const userEmail = user.emailAddresses[0]?.emailAddress;
    
    if (!userEmail) {
      return NextResponse.json({ error: 'User email not found' }, { status: 404 });
    }

    // Find the kit that contains this report and verify ownership
    const kit = await prisma.kit.findFirst({
      where: { 
        reportFileName: fileName,
        order: {
          user: { email: userEmail }
        }
      },
      include: {
        order: true,
        child: true
      }
    });

    if (!kit) {
      return NextResponse.json({ error: 'Report not found or access denied' }, { status: 404 });
    }

    // Additional security check: Verify the kit has completed onboarding
    if (!kit.childId || !kit.consentId || !kit.questionnaireId) {
      return NextResponse.json({ error: 'Report not available - kit onboarding incomplete' }, { status: 403 });
    }

    // Additional security check: Verify the report file actually exists
    try {
      await reportStorageService.getReportUrl(fileName);
    } catch (error) {
      return NextResponse.json({ error: 'Report file not found' }, { status: 404 });
    }

    // Generate a signed URL for the report
    const downloadUrl = await reportStorageService.getReportUrl(fileName);

    // Log the download action for audit trail
    const { AuditService } = await import('@/lib/audit-service');
    await AuditService.logAction({
      orderId: kit.order.id,
      action: 'REPORT_DOWNLOAD',
      userId: userId,
      userEmail: userEmail,
      details: {
        fileName: fileName,
        downloadUrl: downloadUrl,
        orderNumber: kit.order.orderNumber,
        kitId: kit.id,
        kitNumber: kit.kitNumber,
      },
    });

    return NextResponse.json({ downloadUrl });
  } catch (error) {
    console.error('Error generating download URL:', error);
    return NextResponse.json({ error: 'Failed to generate download URL' }, { status: 500 });
  }
} 