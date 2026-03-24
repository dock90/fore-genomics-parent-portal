"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { EyeIcon, DownloadIcon } from "lucide-react";

interface ApprovedKit {
  id: string;
  kitNumber: number;
  trfApprovedAt: string | null;
  trfApprovedBy: string | null;
  order: {
    orderNumber: string;
    parent?: {
      profile?: {
        firstName: string;
        lastName: string;
      };
    };
    purchaser: {
      profile?: {
        firstName: string;
        lastName: string;
      };
    };
  };
  child?: {
    firstName: string | null;
    lastName: string | null;
  };
}

interface ApprovedTRFsTableProps {
  kits: ApprovedKit[];
}

export function ApprovedTRFsTable({ kits }: ApprovedTRFsTableProps) {
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const handleViewPDF = async (kit: ApprovedKit) => {
    setLoadingId(kit.id);
    try {
      const response = await fetch(
        `/api/counselor/trfs/${kit.id}/approved-pdf`
      );
      if (response.ok) {
        const data = await response.json();
        window.open(data.fileUrl, "_blank");
      }
    } catch (error) {
      // silent
    } finally {
      setLoadingId(null);
    }
  };

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  const getChildName = (kit: ApprovedKit) => {
    if (kit.child?.firstName && kit.child?.lastName) {
      return `${kit.child.firstName} ${kit.child.lastName}`;
    }
    return "N/A";
  };

  const getParentName = (kit: ApprovedKit) => {
    if (kit.order.parent?.profile) {
      return `${kit.order.parent.profile.firstName} ${kit.order.parent.profile.lastName}`;
    }
    return "N/A";
  };

  if (kits.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-lg">No approved TRFs found</div>
        <p className="text-gray-400 text-sm mt-2">
          Approved TRFs will appear here after review.
        </p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order Number</TableHead>
            <TableHead>Kit Number</TableHead>
            <TableHead>Child Name</TableHead>
            <TableHead>Parent Name</TableHead>
            <TableHead>Approved Date</TableHead>
            <TableHead>Approved By</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {kits.map((kit) => (
            <TableRow key={kit.id}>
              <TableCell className="font-medium">
                {kit.order.orderNumber}
              </TableCell>
              <TableCell>{kit.kitNumber}</TableCell>
              <TableCell>{getChildName(kit)}</TableCell>
              <TableCell>{getParentName(kit)}</TableCell>
              <TableCell>{formatDate(kit.trfApprovedAt)}</TableCell>
              <TableCell className="text-sm text-gray-600">
                {kit.trfApprovedBy || "N/A"}
              </TableCell>
              <TableCell>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleViewPDF(kit)}
                  disabled={loadingId === kit.id}
                >
                  <EyeIcon className="h-4 w-4 mr-1" />
                  {loadingId === kit.id ? "Loading..." : "View PDF"}
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
