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
import { CheckCircleIcon, EyeIcon } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

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
  const [isApproving, setIsApproving] = useState<string | null>(null);
  const [isViewing, setIsViewing] = useState<string | null>(null);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingKit, setViewingKit] = useState<Kit | null>(null);
  const [trfHTML, setTrfHTML] = useState<string>("");
  const [consentHTML, setConsentHTML] = useState<string>("");

  const handleViewTRF = async (kit: Kit) => {
    setIsViewing(kit.id);
    setViewingKit(kit);
    try {
      const response = await fetch(`/api/counselor/trfs/${kit.id}/view`);
      if (response.ok) {
        const data = await response.json();
        setTrfHTML(data.trfHTML);
        setConsentHTML(data.consentHTML);
        setIsViewModalOpen(true);
      }
    } catch (error) {
    } finally {
      setIsViewing(null);
    }
  };

  const handleApproveTRF = async () => {
    if (!viewingKit) return;

    setIsApproving(viewingKit.id);
    try {
      // Approve TRF with pre-configured signature
      const response = await fetch(
        `/api/counselor/trfs/${viewingKit.id}/approve`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to approve TRF");
      }

      await response.json();

      // Close view modal
      setIsViewModalOpen(false);
      setViewingKit(null);

      // Refresh the page to show updated status
      router.refresh();
    } catch (error) {
    } finally {
      setIsApproving(null);
    }
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
                <TableCell className="font-medium">
                  {kit.order.orderNumber}
                </TableCell>
                <TableCell>{kit.kitNumber}</TableCell>
                <TableCell>{getChildName(kit)}</TableCell>
                <TableCell>{getParentName(kit)}</TableCell>
                <TableCell>{formatDate(kit.createdAt)}</TableCell>
                <TableCell>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleViewTRF(kit)}
                    disabled={isViewing === kit.id}
                  >
                    <EyeIcon className="h-4 w-4 mr-1" />
                    {isViewing === kit.id ? "Loading..." : "View"}
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {/* View TRF/Consent Modal */}
      <Dialog open={isViewModalOpen} onOpenChange={setIsViewModalOpen}>
        <DialogContent className="h-[90vh] p-0" style={{ maxWidth: '900px', width: '95vw', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: 0 }}>
          <DialogHeader className="px-6 pt-4 pb-2">
            <DialogTitle>
              View TRF & Consent - {viewingKit?.order.orderNumber} - Kit{" "}
              {viewingKit?.kitNumber}
            </DialogTitle>
            <DialogDescription>
              Review the TRF and consent documents for this kit
            </DialogDescription>
          </DialogHeader>
          <Tabs defaultValue="trf" className="min-h-0 flex flex-col px-6">
            <TabsList className="grid w-full grid-cols-2 shrink-0">
              <TabsTrigger value="trf">TRF Document</TabsTrigger>
              <TabsTrigger value="consent">Consent Document</TabsTrigger>
            </TabsList>
            <TabsContent
              value="trf"
              className="flex-1 min-h-0 mt-2"
            >
              <iframe
                srcDoc={trfHTML}
                className="w-full h-full border rounded-lg bg-white"
                title="TRF Document"
                sandbox="allow-same-origin"
              />
            </TabsContent>
            <TabsContent
              value="consent"
              className="flex-1 min-h-0 mt-2"
            >
              <iframe
                srcDoc={consentHTML}
                className="w-full h-full border rounded-lg bg-white"
                title="Consent Document"
                sandbox="allow-same-origin"
              />
            </TabsContent>
          </Tabs>
          <DialogFooter className="border-t px-6 py-3">
            <Button variant="outline" onClick={() => setIsViewModalOpen(false)}>
              Close
            </Button>
            <Button
              onClick={handleApproveTRF}
              disabled={!viewingKit || isApproving === viewingKit?.id}
            >
              <CheckCircleIcon className="h-4 w-4 mr-1" />
              {isApproving === viewingKit?.id ? "Approving..." : "Approve TRF"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
