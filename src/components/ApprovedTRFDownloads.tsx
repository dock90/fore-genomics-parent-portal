"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { DownloadIcon, FileIcon, CalendarIcon, UserIcon } from "lucide-react";
import { format } from "date-fns";

interface ApprovedTRF {
  kitId: string;
  orderNumber: string;
  childName: string;
  approvedAt: string;
  kitNumber: number;
  fileName: string;
}

export function ApprovedTRFDownloads() {
  const [approvedTRFs, setApprovedTRFs] = useState<ApprovedTRF[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchApprovedTRFs();
  }, []);

  const fetchApprovedTRFs = async () => {
    try {
      setLoading(true);
      const response = await fetch("/api/admin/approved-trfs");

      if (!response.ok) {
        throw new Error("Failed to fetch approved TRFs");
      }

      const data = await response.json();
      setApprovedTRFs(data.approvedTRFs || []);
    } catch (err) {
      setError("Failed to load approved TRFs");
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (kitId: string, fileName: string) => {
    try {
      const response = await fetch(`/api/trfs/${kitId}/approved`, {
        method: "GET",
      });

      if (!response.ok) {
        throw new Error("Failed to download TRF");
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {}
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16 border border-border rounded-lg">
        <p className="text-sm text-muted-foreground">
          Loading approved TRFs...
        </p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-16 border border-border rounded-lg">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (approvedTRFs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 border border-border rounded-lg">
        <FileIcon className="h-10 w-10 text-muted-foreground mb-3" />
        <p className="text-sm text-muted-foreground">
          No approved TRFs available
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-muted-foreground">
        {approvedTRFs.length} approved TRF{approvedTRFs.length !== 1 ? "s" : ""}{" "}
        available
      </p>
      <div className="border border-border rounded-lg divide-y divide-border">
        {approvedTRFs.map((trf) => (
          <div
            key={trf.kitId}
            className="flex items-center justify-between p-4"
          >
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <h4 className="font-medium text-foreground">
                  Order {trf.orderNumber}
                </h4>
                <Badge variant="secondary" className="text-xs">
                  Kit #{trf.kitNumber}
                </Badge>
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                <div className="flex items-center gap-1">
                  <UserIcon className="h-3.5 w-3.5" />
                  <span>{trf.childName}</span>
                </div>
                <div className="flex items-center gap-1">
                  <CalendarIcon className="h-3.5 w-3.5" />
                  <span>
                    {format(new Date(trf.approvedAt), "MMM dd, yyyy")}
                  </span>
                </div>
                <div className="flex items-center gap-1">
                  <FileIcon className="h-3.5 w-3.5" />
                  <span className="text-xs">{trf.fileName}</span>
                </div>
              </div>
            </div>
            <Button
              onClick={() => handleDownload(trf.kitId, trf.fileName)}
              size="sm"
              className="ml-4"
            >
              <DownloadIcon className="h-4 w-4 mr-1.5" />
              Download
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}
