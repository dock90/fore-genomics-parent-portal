"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
      } else {
        console.error("Failed to fetch audit logs:", data.error);
      }
    } catch (error) {
      console.error("Error fetching audit logs:", error);
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

    // Extract browser and OS info
    const browserMatch = userAgent.match(
      /(Chrome|Firefox|Safari|Edge|Opera)\/[\d.]+/
    );
    const osMatch = userAgent.match(/\((.*?)\)/);

    const browser = browserMatch ? browserMatch[1] : "Unknown Browser";
    const os = osMatch ? osMatch[1].split(";")[0] : "Unknown OS";

    return `${browser} on ${os}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <SearchIcon className="h-5 w-5" />
          Audit Logs
        </CardTitle>
        <CardDescription>
          Track all report-related activities for HIPAA compliance
        </CardDescription>
      </CardHeader>
      <CardContent>
        {/* Search Controls */}
        <div className="flex gap-4 mb-6">
          <Select value={searchType} onValueChange={setSearchTypeHandler}>
            <SelectTrigger className="w-48">
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
              <SelectTrigger className="w-48">
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
              className="w-64"
            />
          )}

          <Button onClick={fetchAuditLogs} disabled={loading}>
            Search
          </Button>
        </div>

        {/* Audit Logs Table */}
        {loading ? (
          <div className="text-center py-8">Loading audit logs...</div>
        ) : (
          <div className="space-y-4">
            {auditLogs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No audit logs found
              </div>
            ) : (
              auditLogs.map((log) => (
                <div
                  key={log.id}
                  className="border rounded-lg p-4 hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex-shrink-0">
                        {getActionIcon(log.action)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <Badge variant={getActionBadgeVariant(log.action)}>
                            {log.action.replace("_", " ")}
                          </Badge>
                          <span className="text-sm font-medium">
                            Order: {log.order.orderNumber}
                          </span>
                        </div>
                        <div className="text-sm text-muted-foreground space-y-1">
                          <p>User: {log.userEmail}</p>
                          <p>IP: {log.ipAddress || "Unknown"}</p>
                          <p>Browser: {formatUserAgent(log.userAgent)}</p>
                          <p>
                            Time:{" "}
                            {format(
                              new Date(log.createdAt),
                              "MMM dd, yyyy HH:mm:ss"
                            )}
                          </p>
                          {log.details &&
                            Object.keys(log.details).length > 0 && (
                              <details className="mt-2">
                                <summary className="cursor-pointer text-xs font-medium">
                                  View Details
                                </summary>
                                <pre className="mt-1 text-xs bg-muted p-2 rounded overflow-auto">
                                  {JSON.stringify(log.details, null, 2)}
                                </pre>
                              </details>
                            )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
