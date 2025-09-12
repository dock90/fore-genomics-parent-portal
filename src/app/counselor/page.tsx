import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";
import { redirect } from "next/navigation";
import { UnapprovedTRFsTable } from "./UnapprovedTRFsTable";

export default async function CounselorDashboard() {
  if (!checkRole("COUNSELOR")) {
    redirect("/");
  }

  // Get all unapproved TRFs
  const unapprovedKits = await prisma.kit.findMany({
    where: {
      trfApproved: false,
      trfFileName: { not: null },
    },
    include: {
      order: {
        include: {
          parent: {
            include: {
              profile: true,
            },
          },
          purchaser: {
            include: {
              profile: true,
            },
          },
        },
      },
      child: true,
      consent: true,
      questionnaire: true,
    },
    orderBy: {
      createdAt: 'desc',
    },
  });

  // Get statistics
  const totalUnapproved = unapprovedKits.length;
  const todayApproved = await prisma.kit.count({
    where: {
      trfApproved: true,
      trfApprovedAt: {
        gte: new Date(new Date().setHours(0, 0, 0, 0)),
      },
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Counselor Dashboard</h1>
        <p className="text-gray-600">
          Review and approve TRF files for genetic testing
        </p>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Unapproved TRFs</p>
              <p className="text-2xl font-bold text-gray-900">{totalUnapproved}</p>
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Approved Today</p>
              <p className="text-2xl font-bold text-gray-900">{todayApproved}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Unapproved TRFs Table */}
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">Unapproved TRFs</h2>
          <p className="text-sm text-gray-600">
            Review and approve TRF files that require counselor attention
          </p>
        </div>
        <div className="p-6">
          <UnapprovedTRFsTable kits={unapprovedKits} />
        </div>
      </div>
    </div>
  );
}
