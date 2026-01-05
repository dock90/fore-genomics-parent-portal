import { hasApprovedTRFAccess } from "@/utils/approved-trf-access";
import { ApprovedTRFDownloads } from "@/components/ApprovedTRFDownloads";
import { ShieldAlertIcon } from "lucide-react";

export default async function ApprovedTRFsPage() {
  // Check if user has approved TRF access
  const hasApprovedTRFAccessFlag = await hasApprovedTRFAccess();

  if (!hasApprovedTRFAccessFlag) {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div>
          <h1 className="text-2xl font-semibold text-foreground">
            Approved TRFs
          </h1>
          <p className="text-muted-foreground mt-1">
            Download approved Test Requisition Forms
          </p>
        </div>

        {/* Access Denied */}
        <div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg">
          <ShieldAlertIcon className="h-10 w-10 text-muted-foreground mb-3" />
          <h2 className="text-base font-medium text-foreground mb-1">
            Access Restricted
          </h2>
          <p className="text-sm text-muted-foreground text-center max-w-sm">
            You don't have permission to access approved TRF downloads. Contact
            your administrator to request access.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Approved TRFs</h1>
        <p className="text-muted-foreground mt-1">
          Download approved Test Requisition Forms for completed orders
        </p>
      </div>

      {/* Approved TRF Downloads */}
      <ApprovedTRFDownloads />
    </div>
  );
}
