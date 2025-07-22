import { AuditLogViewer } from '../AuditLogViewer'

export default async function AuditLogsPage() {
  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Audit Logs</h1>
        <p className="text-gray-600 mt-2">HIPAA compliance and activity tracking</p>
      </div>

      {/* Audit Log Viewer */}
      <AuditLogViewer />
    </div>
  )
} 