"use client";

import { useState, useEffect } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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

      // Create blob and download
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
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileIcon className="h-5 w-5" />
            Approved TRF Downloads
          </CardTitle>
          <CardDescription>
            Download approved Test Requisition Forms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">
              Loading approved TRFs...
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileIcon className="h-5 w-5" />
            Approved TRF Downloads
          </CardTitle>
          <CardDescription>
            Download approved Test Requisition Forms
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-red-500">{error}</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileIcon className="h-5 w-5" />
          Approved TRF Downloads
        </CardTitle>
        <CardDescription>
          Download approved Test Requisition Forms ({approvedTRFs.length}{" "}
          available)
        </CardDescription>
      </CardHeader>
      <CardContent>
        {approvedTRFs.length === 0 ? (
          <div className="flex items-center justify-center py-8">
            <div className="text-sm text-gray-500">
              No approved TRFs available
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedTRFs.map((trf) => (
              <div
                key={trf.kitId}
                className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <h4 className="font-medium text-gray-900">
                      Order {trf.orderNumber}
                    </h4>
                    <Badge variant="secondary" className="text-xs">
                      Approved
                    </Badge>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-2 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <UserIcon className="h-4 w-4" />
                      <span>{trf.childName}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <CalendarIcon className="h-4 w-4" />
                      <span>
                        {format(new Date(trf.approvedAt), "MMM dd, yyyy")}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <FileIcon className="h-4 w-4" />
                      <span>Kit #{trf.kitNumber}</span>
                    </div>
                  </div>
                  <div className="mt-2 text-xs text-gray-500">
                    File: {trf.fileName}
                  </div>
                </div>
                <Button
                  onClick={() => handleDownload(trf.kitId, trf.fileName)}
                  size="sm"
                  className="ml-4"
                >
                  <DownloadIcon className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
