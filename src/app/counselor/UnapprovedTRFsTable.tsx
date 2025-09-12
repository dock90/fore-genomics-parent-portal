"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DownloadIcon, UploadIcon, EyeIcon } from "lucide-react";

interface Kit {
  id: string;
  kitNumber: number;
  trfFileName: string | null;
  createdAt: string;
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

interface UnapprovedTRFsTableProps {
  kits: Kit[];
}

export function UnapprovedTRFsTable({ kits }: UnapprovedTRFsTableProps) {
  const router = useRouter();
  const [selectedKit, setSelectedKit] = useState<Kit | null>(null);
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [approvedTRFFile, setApprovedTRFFile] = useState<File | null>(null);

  const handleDownloadTRF = async (kit: Kit) => {
    setIsDownloading(kit.id);
    try {
      const response = await fetch(`/api/counselor/trfs/${kit.id}/download`);
      if (response.ok) {
        const data = await response.json();
        // Open the download URL in a new tab
        window.open(data.fileUrl, '_blank');
      } else {
        const error = await response.json();
        alert(`Error downloading TRF: ${error.error}`);
      }
    } catch (error) {
      console.error("Error downloading TRF:", error);
      alert("Failed to download TRF");
    } finally {
      setIsDownloading(null);
    }
  };

  const handleUploadApprovedTRF = async () => {
    if (!selectedKit || !approvedTRFFile) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("approvedTRF", approvedTRFFile);

      const response = await fetch(`/api/counselor/trfs/${selectedKit.id}/approve`, {
        method: "POST",
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        alert("TRF approved successfully!");
        setIsUploadDialogOpen(false);
        setSelectedKit(null);
        setApprovedTRFFile(null);
        router.refresh();
      } else {
        const error = await response.json();
        alert(`Error approving TRF: ${error.error}`);
      }
    } catch (error) {
      console.error("Error approving TRF:", error);
      alert("Failed to approve TRF");
    } finally {
      setIsUploading(false);
    }
  };

  const openUploadDialog = (kit: Kit) => {
    setSelectedKit(kit);
    setIsUploadDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const getChildName = (kit: Kit) => {
    if (kit.child?.firstName && kit.child?.lastName) {
      return `${kit.child.firstName} ${kit.child.lastName}`;
    }
    return "N/A";
  };

  const getParentName = (kit: Kit) => {
    if (kit.order.parent?.profile) {
      return `${kit.order.parent.profile.firstName} ${kit.order.parent.profile.lastName}`;
    }
    return "N/A";
  };

  if (kits.length === 0) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-500 text-lg">No unapproved TRFs found</div>
        <p className="text-gray-400 text-sm mt-2">
          All TRFs have been approved or no TRFs are available for review.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Order Number</TableHead>
              <TableHead>Kit Number</TableHead>
              <TableHead>Child Name</TableHead>
              <TableHead>Parent Name</TableHead>
              <TableHead>Created Date</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {kits.map((kit) => (
              <TableRow key={kit.id}>
                <TableCell className="font-medium">{kit.order.orderNumber}</TableCell>
                <TableCell>{kit.kitNumber}</TableCell>
                <TableCell>{getChildName(kit)}</TableCell>
                <TableCell>{getParentName(kit)}</TableCell>
                <TableCell>{formatDate(kit.createdAt)}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadTRF(kit)}
                      disabled={isDownloading === kit.id}
                    >
                      <DownloadIcon className="h-4 w-4 mr-1" />
                      {isDownloading === kit.id ? "Downloading..." : "Download"}
                    </Button>
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => openUploadDialog(kit)}
                    >
                      <UploadIcon className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* Upload Approved TRF Dialog */}
      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload Approved TRF</DialogTitle>
            <DialogDescription>
              Upload the approved TRF file for {selectedKit?.order.orderNumber} - Kit {selectedKit?.kitNumber}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="approvedTRF">Approved TRF File</Label>
              <Input
                id="approvedTRF"
                type="file"
                accept=".xlsx,.xls"
                onChange={(e) => setApprovedTRFFile(e.target.files?.[0] || null)}
              />
              <p className="text-sm text-gray-500 mt-1">
                Please upload an Excel file (.xlsx or .xls)
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsUploadDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUploadApprovedTRF}
              disabled={!approvedTRFFile || isUploading}
            >
              {isUploading ? "Uploading..." : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
