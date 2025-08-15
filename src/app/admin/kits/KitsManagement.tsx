"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  PackageIcon,
  ClockIcon,
  CheckCircleIcon,
  DownloadIcon,
  SearchIcon,
  TruckIcon,
  HomeIcon,
  BeakerIcon,
} from "lucide-react";
import { useState, useMemo } from "react";

interface Kit {
  id: string;
  kitNumber: number;
  kitType: string;
  reportFileName?: string | null;
  trfFileName?: string | null;
  createdAt: Date;
  updatedAt: Date;
  order: {
    id: string;
    orderNumber: string;
    status: string;
    statusUpdatedAt: Date;
    parent?: {
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
      } | null;
    } | null;
    purchaser: {
      email: string;
      profile?: {
        firstName: string;
        lastName: string;
      } | null;
    };
  };
  child?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    dob: string | null;
    dueDate: string | null;
    sex: string | null;
    ethnicities: string[];
  } | null;
  consent?: {
    id: string;
    accepted: boolean;
    signerName: string | null;
    relationshipToChild: string | null;
    consentFileName?: string | null;
  } | null;
  questionnaire?: {
    id: string;
    question1: boolean;
    question2: boolean;
    question3: boolean;
  } | null;
}

interface KitsManagementProps {
  kits: Kit[];
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "ORDER_RECEIVED":
      return "secondary";
    case "ONBOARDING_COMPLETED":
      return "default";
    case "PREPARING_ORDER":
      return "outline";
    case "SHIPPED_TO_USER":
      return "default";
    case "DELIVERED_AWAITING_RETURN":
      return "default";
    case "SHIPPED_TO_LAB":
      return "default";
    case "RECEIVED_IN_PROCESS":
      return "default";
    case "COMPLETE_REPORT_DELIVERED":
    case "COMPLETE_COUNSELING_REQUIRED":
      return "default";
    default:
      return "secondary";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "ORDER_RECEIVED":
      return <ClockIcon className="h-3 w-3" />;
    case "ONBOARDING_COMPLETED":
      return <CheckCircleIcon className="h-3 w-3" />;
    case "PREPARING_ORDER":
      return <PackageIcon className="h-3 w-3" />;
    case "SHIPPED_TO_USER":
      return <TruckIcon className="h-3 w-3" />;
    case "DELIVERED_AWAITING_RETURN":
      return <HomeIcon className="h-3 w-3" />;
    case "SHIPPED_TO_LAB":
      return <TruckIcon className="h-3 w-3" />;
    case "RECEIVED_IN_PROCESS":
      return <BeakerIcon className="h-3 w-3" />;
    case "COMPLETE_REPORT_DELIVERED":
    case "COMPLETE_COUNSELING_REQUIRED":
      return <CheckCircleIcon className="h-3 w-3" />;
    default:
      return <ClockIcon className="h-3 w-3" />;
  }
}

export function KitsManagement({ kits }: KitsManagementProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [kitTypeFilter, setKitTypeFilter] = useState<string>("all");

  const getTRFDownloadUrl = (kit: Kit) => {
    return `/api/admin/kits/${kit.id}/trf`;
  };

  const generateReportUrl = (kit: Kit) => {
    if (!kit.reportFileName) return null;
    return `/api/admin/kits/${kit.id}/report`;
  };

  const generateConsentPDFUrl = (kit: Kit) => {
    if (!kit.consent?.id) return null;
    return `/api/admin/consents/${kit.consent.id}/pdf`;
  };

  const getCombinedArchiveUrl = (kit: Kit) => {
    if (!kit.trfFileName || !kit.consent?.id) return null;
    return `/api/admin/kits/${kit.id}/combined`;
  };

  // Filter kits based on search term and filters
  const filteredKits = useMemo(() => {
    return kits.filter((kit) => {
      // Search filter
      const searchLower = searchTerm.toLowerCase();
      const matchesSearch = 
        kit.order.orderNumber.toLowerCase().includes(searchLower) ||
        kit.order.purchaser.email.toLowerCase().includes(searchLower) ||
        kit.order.purchaser.profile?.firstName?.toLowerCase().includes(searchLower) ||
        kit.order.purchaser.profile?.lastName?.toLowerCase().includes(searchLower) ||
        kit.child?.firstName?.toLowerCase().includes(searchLower) ||
        kit.child?.lastName?.toLowerCase().includes(searchLower) ||
        kit.kitNumber.toString().includes(searchLower);

      // Status filter
      const matchesStatus = statusFilter === "all" || kit.order.status === statusFilter;

      // Kit type filter
      const matchesKitType = kitTypeFilter === "all" || kit.kitType === kitTypeFilter;

      return matchesSearch && matchesStatus && matchesKitType;
    });
  }, [kits, searchTerm, statusFilter, kitTypeFilter]);

  // Get unique statuses and kit types for filters
  const uniqueStatuses = useMemo(() => {
    const statuses = Array.from(new Set(kits.map(kit => kit.order.status)));
    return statuses.sort();
  }, [kits]);

  const uniqueKitTypes = useMemo(() => {
    const types = Array.from(new Set(kits.map(kit => kit.kitType)));
    return types.sort();
  }, [kits]);

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <SearchIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by order number, customer, or child name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            {uniqueStatuses.map((status) => (
              <SelectItem key={status} value={status}>
                {status.replace(/_/g, " ")}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={kitTypeFilter} onValueChange={setKitTypeFilter}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue placeholder="Filter by kit type" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Kit Types</SelectItem>
            {uniqueKitTypes.map((type) => (
              <SelectItem key={type} value={type}>
                {type}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      {/* Results count */}
      <div className="text-sm text-muted-foreground">
        Showing {filteredKits.length} of {kits.length} kits
      </div>

      {filteredKits.length === 0 ? (
        <div className="text-center py-8">
          <PackageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-foreground mb-2">
            No kits found
          </h3>
          <p className="text-muted-foreground">
            {kits.length === 0 
              ? "No kits have been created yet."
              : "No kits match your search criteria."
            }
          </p>
        </div>
      ) : (
        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Kit #</TableHead>
                <TableHead>Order #</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Child</TableHead>
                <TableHead>Kit Type</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredKits.map((kit) => (
                <TableRow key={kit.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">
                    {kit.kitNumber}
                  </TableCell>
                  <TableCell>
                    <span className="font-medium">{kit.order.orderNumber}</span>
                  </TableCell>
                  <TableCell>
                    <div className="flex flex-col">
                      <span className="font-medium">
                        {kit.order.purchaser.profile?.firstName} {kit.order.purchaser.profile?.lastName}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {kit.order.purchaser.email}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    {kit.child ? (
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {kit.child.firstName} {kit.child.lastName}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {kit.child.dob || "DOB not specified"}
                        </span>
                      </div>
                    ) : (
                      <span className="text-muted-foreground text-sm">No child assigned</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs">
                      {kit.kitType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant={getStatusBadgeVariant(kit.order.status)}>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(kit.order.status)}
                        {kit.order.status.replace(/_/g, " ")}
                      </div>
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                              <Button
          variant="outline"
          size="sm"
          onClick={() => window.open(getTRFDownloadUrl(kit), '_blank')}
          className="h-8 px-2"
        >
          <DownloadIcon className="h-3 w-3 mr-1" />
          TRF
        </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!kit.consent?.id}
                        onClick={() => {
                          const consentUrl = generateConsentPDFUrl(kit);
                          if (consentUrl) {
                            window.open(consentUrl, '_blank');
                          }
                        }}
                        className="h-8 px-2"
                      >
                        <DownloadIcon className="h-3 w-3 mr-1" />
                        Consent
                      </Button>
        <Button
          variant="outline"
          size="sm"
          disabled={!kit.trfFileName || !kit.consent?.id}
          onClick={() => {
            // Debug logging
            console.log(`Kit ${kit.kitNumber}: TRF=${kit.trfFileName}, Consent=${kit.consent?.id}`);
            
            const combinedUrl = getCombinedArchiveUrl(kit);
            if (combinedUrl) {
              window.open(combinedUrl, '_blank');
            }
          }}
          className="h-8 px-2"
        >
          <DownloadIcon className="h-3 w-3 mr-1" />
          Both
        </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!kit.reportFileName}
                        onClick={() => {
                          const reportUrl = generateReportUrl(kit);
                          if (reportUrl) {
                            window.open(reportUrl, '_blank');
                          }
                        }}
                        className="h-8 px-2"
                      >
                        <DownloadIcon className="h-3 w-3 mr-1" />
                        Report
                      </Button>

                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
} 