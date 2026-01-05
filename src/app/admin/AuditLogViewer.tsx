"use client";

import { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format } from "date-fns";
import {
  SearchIcon,
  DownloadIcon,
  UploadIcon,
  EyeIcon,
  TrashIcon,
} from "lucide-react";

interface AuditLog {
  id: string;
  orderId: string;
  action: string;
  userId: string;
  userEmail: string;
  ipAddress: string | null;
  userAgent: string | null;
  details: any;
  createdAt: string;
  order: {
    orderNumber: string;
    status: string;
  };
}

export function AuditLogViewer() {
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchType, setSearchType] = useState<
    "all" | "orderId" | "userEmail" | "action"
  >("all");
  const setSearchTypeHandler = (value: string) => {
    setSearchType(value as "all" | "orderId" | "userEmail" | "action");
  };
  const [searchValue, setSearchValue] = useState("");
  const [selectedAction, setSelectedAction] = useState<string>("");

  const fetchAuditLogs = async () => {
    setLoading(true);
    try {
      let url = "/api/admin/audit-logs?limit=100";

      if (searchType === "orderId" && searchValue) {
        url += `&orderId=${encodeURIComponent(searchValue)}`;
      } else if (searchType === "userEmail" && searchValue) {
        url += `&userEmail=${encodeURIComponent(searchValue)}`;
      } else if (searchType === "action" && selectedAction) {
        url += `&action=${encodeURIComponent(selectedAction)}`;
      }

      const response = await fetch(url);
      const data = await response.json();

      if (response.ok) {
        setAuditLogs(data.auditLogs);
      }
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAuditLogs();
  }, []);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "REPORT_UPLOAD":
        return <UploadIcon className="h-4 w-4" />;
      case "REPORT_DOWNLOAD":
        return <DownloadIcon className="h-4 w-4" />;
      case "REPORT_ACCESS":
        return <EyeIcon className="h-4 w-4" />;
      case "REPORT_DELETE":
        return <TrashIcon className="h-4 w-4" />;
      default:
        return <SearchIcon className="h-4 w-4" />;
    }
  };

  const getActionBadgeVariant = (action: string) => {
    switch (action) {
      case "REPORT_UPLOAD":
        return "default";
      case "REPORT_DOWNLOAD":
        return "secondary";
      case "REPORT_ACCESS":
        return "outline";
      case "REPORT_DELETE":
        return "destructive";
      default:
        return "secondary";
    }
  };

  const formatUserAgent = (userAgent: string | null) => {
    if (!userAgent) return "Unknown";

    const browserMatch = userAgent.match(
      /(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/
    );
    const osMatch = userAgent.match(/\((.*?)\)/);

    const browser = browserMatch ? browserMatch[1] : "Unknown Browser";
    const os = osMatch ? osMatch[1].split(";")[0] : "Unknown OS";

    return `${browser} on ${os}`;
  };

  return (
    <div className="space-y-4">
      {/* Search Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Select value={searchType} onValueChange={setSearchTypeHandler}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Activities</SelectItem>
            <SelectItem value="orderId">By Order ID</SelectItem>
            <SelectItem value="userEmail">By User Email</SelectItem>
            <SelectItem value="action">By Action Type</SelectItem>
          </SelectContent>
        </Select>

        {searchType === "action" ? (
          <Select value={selectedAction} onValueChange={setSelectedAction}>
            <SelectTrigger className="w-full sm:w-[180px]">
              <SelectValue placeholder="Select action type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="REPORT_UPLOAD">Report Upload</SelectItem>
              <SelectItem value="REPORT_DOWNLOAD">Report Download</SelectItem>
              <SelectItem value="REPORT_ACCESS">Report Access</SelectItem>
              <SelectItem value="REPORT_DELETE">Report Delete</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <Input
            placeholder={
              searchType === "orderId"
                ? "Enter Order ID"
                : searchType === "userEmail"
                  ? "Enter User Email"
                  : "Search..."
            }
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            className="w-full sm:w-64"
          />
        )}

        <Button onClick={fetchAuditLogs} disabled={loading} size="default">
          Search
        </Button>
      </div>

      {/* Audit Logs */}
      {loading ? (
        <div className="flex items-center justify-center py-16 border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">Loading audit logs...</p>
        </div>
      ) : auditLogs.length === 0 ? (
        <div className="flex items-center justify-center py-16 border border-border rounded-lg">
          <p className="text-sm text-muted-foreground">No audit logs found</p>
        </div>
      ) : (
        <div className="border border-border rounded-lg divide-y divide-border">
          {auditLogs.map((log) => (
            <div
              key={log.id}
              className="flex items-start gap-3 p-3"
            >
              <div className="flex-shrink-0 mt-0.5 text-muted-foreground">
                {getActionIcon(log.action)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge variant={getActionBadgeVariant(log.action)} className="text-xs">
                    {log.action.replace("_", " ")}
                  </Badge>
                  <span className="text-sm font-medium text-foreground">
                    Order {log.order.orderNumber}
                  </span>
                </div>
                <div className="text-xs text-muted-foreground space-y-0.5">
                  <p>
                    {log.userEmail} • {log.ipAddress || "Unknown IP"} •{" "}
                    {formatUserAgent(log.userAgent)}
                  </p>
                  <p>
                    {format(new Date(log.createdAt), "MMM dd, yyyy HH:mm:ss")}
                  </p>
                </div>
                {log.details && Object.keys(log.details).length > 0 && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
                      View Details
                    </summary>
                    <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto max-h-32">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  </details>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
