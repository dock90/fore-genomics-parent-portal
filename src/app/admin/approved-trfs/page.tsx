import { hasApprovedTRFAccess } from "@/utils/approved-trf-access";
import { ApprovedTRFDownloads } from "@/components/ApprovedTRFDownloads";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ShieldIcon } from "lucide-react";

export default async function ApprovedTRFsPage() {
  // Check if user has approved TRF access
  const hasApprovedTRFAccessFlag = await hasApprovedTRFAccess();

  if (!hasApprovedTRFAccessFlag) {
    return (
      <div className="space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Approved TRFs</h1>
          <p className="text-gray-600 mt-2">
            Download approved Test Requisition Forms
          </p>
        </div>

        {/* Access Denied */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShieldIcon className="h-5 w-5 text-red-500" />
              Access Restricted
            </CardTitle>
            <CardDescription>
              You don't have permission to access approved TRF downloads
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-center py-8">
              <div className="text-center">
                <ShieldIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">
                  Contact your administrator to request access to approved TRF
                  downloads.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Approved TRFs</h1>
        <p className="text-gray-600 mt-2">
          Download approved Test Requisition Forms for completed orders
        </p>
      </div>

      {/* Approved TRF Downloads */}
      <ApprovedTRFDownloads />
    </div>
  );
}
