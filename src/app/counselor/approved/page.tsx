import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";
import { redirect } from "next/navigation";
import { ApprovedTRFsTable } from "../ApprovedTRFsTable";

export default async function ApprovedTRFsPage() {
  if (!(await checkRole("COUNSELOR"))) {
    redirect("/");
  }

  const approvedKitsRaw = await prisma.kit.findMany({
    where: {
      trfApproved: true,
      trfApprovedFileName: { not: null },
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
    },
    orderBy: {
      trfApprovedAt: "desc",
    },
  });

  const approvedKits = approvedKitsRaw.map((kit) => ({
    id: kit.id,
    kitNumber: kit.kitNumber,
    trfApprovedAt: kit.trfApprovedAt?.toISOString() || null,
    trfApprovedBy: kit.trfApprovedBy,
    order: {
      orderNumber: kit.order.orderNumber,
      parent: kit.order.parent
        ? {
            profile: kit.order.parent.profile
              ? {
                  firstName: kit.order.parent.profile.firstName,
                  lastName: kit.order.parent.profile.lastName,
                }
              : undefined,
          }
        : undefined,
      purchaser: {
        profile: kit.order.purchaser.profile
          ? {
              firstName: kit.order.purchaser.profile.firstName,
              lastName: kit.order.purchaser.profile.lastName,
            }
          : undefined,
      },
    },
    child: kit.child
      ? {
          firstName: kit.child.firstName,
          lastName: kit.child.lastName,
        }
      : undefined,
  }));

  const totalApproved = approvedKits.length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Approved TRFs</h1>
        <p className="text-gray-600">
          View historically approved TRF documents
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-1 gap-6">
        <div className="bg-white p-6 rounded-lg border border-gray-200">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <svg
                className="w-6 h-6 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                />
              </svg>
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">
                Total Approved
              </p>
              <p className="text-2xl font-bold text-gray-900">{totalApproved}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900">
            Approved TRFs
          </h2>
          <p className="text-sm text-gray-600">
            Previously reviewed and approved TRF documents
          </p>
        </div>
        <div className="p-6">
          <ApprovedTRFsTable kits={approvedKits} />
        </div>
      </div>
    </div>
  );
}
