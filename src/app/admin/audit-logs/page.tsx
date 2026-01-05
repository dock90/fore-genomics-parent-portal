import { AuditLogViewer } from "../AuditLogViewer";

export default async function AuditLogsPage() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-semibold text-foreground">Audit Logs</h1>
        <p className="text-muted-foreground mt-1">
          HIPAA compliance and activity tracking
        </p>
      </div>

      {/* Audit Log Viewer */}
      <AuditLogViewer />
    </div>
  );
}
