import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";
import { reportStorageService } from "@/lib/report-storage";

type ReportType = 'parent' | 'pediatrician' | 'fullLab' | 'legacy';

const REPORT_TYPE_DB_FIELDS: Record<ReportType, keyof typeof kitSelectFields> = {
  parent: 'parentReportFileName',
  pediatrician: 'pediatricianReportFileName',
  fullLab: 'fullLabReportFileName',
  legacy: 'reportFileName',
};

const kitSelectFields = {
  id: true,
  reportFileName: true,
  parentReportFileName: true,
  pediatricianReportFileName: true,
  fullLabReportFileName: true,
  order: {
    select: {
      orderNumber: true,
    },
  },
} as const;

export async function GET(
  request: NextRequest,
  { params }: { params: { kitId: string } }
) {
  const { kitId } = params;
  const searchParams = request.nextUrl.searchParams;
  const reportType = (searchParams.get('type') as ReportType) || 'legacy';

  try {
    // Check if user is admin
    if (!checkRole("ADMIN")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get the kit with report information
    const kit = await prisma.kit.findUnique({
      where: { id: kitId },
      select: kitSelectFields,
    });

    if (!kit) {
      return NextResponse.json({ error: "Kit not found" }, { status: 404 });
    }

    // Get the appropriate report file name based on type
    const dbField = REPORT_TYPE_DB_FIELDS[reportType];
    const reportFileName = kit[dbField] as string | null;

    if (!reportFileName) {
      return NextResponse.json(
        { error: `No ${reportType} report available for this kit` },
        { status: 404 }
      );
    }

    // Generate a signed URL for the report
    const signedUrl = await reportStorageService.getReportUrl(reportFileName);

    // Redirect to the signed URL
    return NextResponse.redirect(signedUrl);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to download report" },
      { status: 500 }
    );
  }
}
