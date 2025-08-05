"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { updateOrderStatus, deleteOrder } from "./_actions";
import {
  PackageIcon,
  CalendarIcon,
  ClockIcon,
  CheckCircleIcon,
} from "lucide-react";
import { format } from "date-fns";
import { useRouter } from "next/navigation";
import { useState } from "react";

interface Order {
  id: string;
  orderNumber: string;
  status: string;
  statusUpdatedAt: Date;
  estimatedDelivery?: Date | null;
  outboundTrackingNumber?: string | null;
  inboundTrackingNumber?: string | null;
  notes?: string | null;
  kits: {
    id: string;
    kitNumber: number;
    kitType: string;
    reportFileName?: string | null;
    child?: {
      id: string;
      userId: string;
      firstName: string | null;
      lastName: string | null;
      dob: string | null;
      dueDate: string | null;
      sex: string | null;
      ethnicities: string[];
      createdAt: Date;
      updatedAt: Date;
    } | null;
  }[];
  parent?: {
    email: string;
    profile?: {
      id: string;
      userId: string;
      firstName: string;
      lastName: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  } | null;
  purchaser: {
    email: string;
    profile?: {
      id: string;
      userId: string;
      firstName: string;
      lastName: string;
      address: string;
      city: string;
      state: string;
      zipCode: string;
      phone: string;
      createdAt: Date;
      updatedAt: Date;
    } | null;
  };
}

interface OrdersManagementProps {
  orders: Order[];
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case "ORDER_RECEIVED":
      return "secondary";
    case "ONBOARDING_COMPLETED":
      return "secondary";
    case "PREPARING_ORDER":
      return "default";
    case "SHIPPED_TO_USER":
      return "outline";
    case "DELIVERED_AWAITING_RETURN":
      return "outline";
    case "SHIPPED_TO_LAB":
      return "outline";
    case "RECEIVED_IN_PROCESS":
      return "default";
    case "COMPLETE_REPORT_DELIVERED":
      return "default";
    default:
      return "secondary";
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case "ORDER_RECEIVED":
      return <PackageIcon className="h-4 w-4" />;
    case "ONBOARDING_COMPLETED":
      return <CheckCircleIcon className="h-4 w-4" />;
    case "PREPARING_ORDER":
      return <PackageIcon className="h-4 w-4" />;
    case "SHIPPED_TO_USER":
      return <PackageIcon className="h-4 w-4" />;
    case "DELIVERED_AWAITING_RETURN":
      return <ClockIcon className="h-4 w-4" />;
    case "SHIPPED_TO_LAB":
      return <PackageIcon className="h-4 w-4" />;
    case "RECEIVED_IN_PROCESS":
      return <ClockIcon className="h-4 w-4" />;
    case "COMPLETE_REPORT_DELIVERED":
      return <CheckCircleIcon className="h-4 w-4" />;
    default:
      return <PackageIcon className="h-4 w-4" />;
  }
}

export function OrdersManagement({ orders }: OrdersManagementProps) {
  const router = useRouter();
  const [selectedStatuses, setSelectedStatuses] = useState<
    Record<string, string>
  >({});
  const [trackingNumbers, setTrackingNumbers] = useState<
    Record<string, { outbound: string; inbound: string }>
  >({});
  const [reportFiles, setReportFiles] = useState<Record<string, File | null>>(
    {}
  );

  const orderStatuses = [
    "ORDER_RECEIVED",
    "ONBOARDING_COMPLETED",
    "PREPARING_ORDER",
    "SHIPPED_TO_USER",
    "DELIVERED_AWAITING_RETURN",
    "SHIPPED_TO_LAB",
    "RECEIVED_IN_PROCESS",
    "COMPLETE_REPORT_DELIVERED",
    "COMPLETE_COUNSELING_REQUIRED",
  ];

  const handleUpdateOrder = async (formData: FormData) => {
    await updateOrderStatus(formData);
    router.refresh();
  };

  const handleTrackingNumberChange = (
    orderId: string,
    type: "outbound" | "inbound",
    value: string
  ) => {
    setTrackingNumbers((prev) => ({
      ...prev,
      [orderId]: {
        ...prev[orderId],
        [type]: value,
      },
    }));
  };

  const isUpdateDisabled = (order: Order, selectedStatus: string) => {
    if (selectedStatus === "SHIPPED_TO_USER") {
      const currentTracking = trackingNumbers[order.id] || {
        outbound: order.outboundTrackingNumber || "",
        inbound: order.inboundTrackingNumber || "",
      };
      return (
        !currentTracking.outbound?.trim() || !currentTracking.inbound?.trim()
      );
    }

    if (selectedStatus === "COMPLETE_REPORT_DELIVERED") {
      // Check if all kits have reports (either existing or newly selected)
      const allKitsHaveReports = order.kits.every((kit) => {
        const hasExistingReport =
          kit.reportFileName !== null && kit.reportFileName !== undefined;
        const hasNewReport = reportFiles[`${order.id}-${kit.id}`] !== undefined;
        return hasExistingReport || hasNewReport;
      });
      return !allKitsHaveReports;
    }

    if (selectedStatus === "COMPLETE_COUNSELING_REQUIRED") {
      // Check if all kits have reports (either existing or newly selected)
      const allKitsHaveReports = order.kits.every((kit) => {
        const hasExistingReport =
          kit.reportFileName !== null && kit.reportFileName !== undefined;
        const hasNewReport = reportFiles[`${order.id}-${kit.id}`] !== undefined;
        return hasExistingReport || hasNewReport;
      });
      return !allKitsHaveReports;
    }

    return false;
  };

  const getValidationMessage = (order: Order, selectedStatus: string) => {
    if (selectedStatus === "SHIPPED_TO_USER") {
      const currentTracking = trackingNumbers[order.id] || {
        outbound: order.outboundTrackingNumber || "",
        inbound: order.inboundTrackingNumber || "",
      };
      if (
        !currentTracking.outbound?.trim() ||
        !currentTracking.inbound?.trim()
      ) {
        return "Both tracking numbers required";
      }
    }

    if (selectedStatus === "COMPLETE_REPORT_DELIVERED") {
      // Check which kits are missing reports
      const kitsWithoutReports = order.kits.filter((kit) => {
        const hasExistingReport =
          kit.reportFileName !== null && kit.reportFileName !== undefined;
        const hasNewReport = reportFiles[`${order.id}-${kit.id}`] !== undefined;
        return !hasExistingReport && !hasNewReport;
      });

      if (kitsWithoutReports.length > 0) {
        const kitNumbers = kitsWithoutReports
          .map((kit) => `Kit ${kit.kitNumber}`)
          .join(", ");
        return `Reports required for: ${kitNumbers}`;
      }
    }

    if (selectedStatus === "COMPLETE_COUNSELING_REQUIRED") {
      // Check which kits are missing reports
      const kitsWithoutReports = order.kits.filter((kit) => {
        const hasExistingReport =
          kit.reportFileName !== null && kit.reportFileName !== undefined;
        const hasNewReport = reportFiles[`${order.id}-${kit.id}`] !== undefined;
        return !hasExistingReport && !hasNewReport;
      });

      if (kitsWithoutReports.length > 0) {
        const kitNumbers = kitsWithoutReports
          .map((kit) => `Kit ${kit.kitNumber}`)
          .join(", ");
        return `Reports required for: ${kitNumbers}`;
      }
    }

    return null;
  };

  const handleDeleteOrder = async (formData: FormData) => {
    await deleteOrder(formData);
    router.refresh();
  };

  const handleStatusChange = (orderId: string, status: string) => {
    setSelectedStatuses((prev) => ({
      ...prev,
      [orderId]: status,
    }));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="h-5 w-5" />
          Order Management
        </CardTitle>
        <CardDescription>
          Manage order statuses and track progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <PackageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                No orders found
              </h3>
              <p className="text-muted-foreground">
                No orders have been created yet.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        Order #{order.orderNumber}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {getStatusIcon(order.status)}
                        {order.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>
                        Customer: {order.purchaser?.profile?.firstName}{" "}
                        {order.purchaser?.profile?.lastName} (
                        {order.purchaser?.email})
                      </p>
                      <p>
                        Last Updated:{" "}
                        {format(
                          new Date(order.statusUpdatedAt),
                          "MMM dd, yyyy HH:mm"
                        )}
                      </p>
                      {order.estimatedDelivery && (
                        <p>
                          Estimated Delivery:{" "}
                          {format(
                            new Date(order.estimatedDelivery),
                            "MMM dd, yyyy"
                          )}
                        </p>
                      )}
                      {order.outboundTrackingNumber && (
                        <p>Outbound Tracking: {order.outboundTrackingNumber}</p>
                      )}
                      {order.inboundTrackingNumber && (
                        <p>Inbound Tracking: {order.inboundTrackingNumber}</p>
                      )}
                    </div>
                  </div>
                </div>

                <form action={handleUpdateOrder} className="space-y-3">
                  <input type="hidden" name="orderId" value={order.id} />

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select
                        name="status"
                        defaultValue={order.status}
                        onValueChange={(value) =>
                          handleStatusChange(order.id, value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {orderStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replace(/_/g, " ")}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <Textarea
                        name="notes"
                        placeholder="Add notes about this order..."
                        defaultValue={order.notes || ""}
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>

                  {/* Tracking Numbers - Show when SHIPPED_TO_USER or later is selected, but not for COMPLETE_REPORT_DELIVERED */}
                  {(selectedStatuses[order.id] === "SHIPPED_TO_USER" ||
                    order.status === "SHIPPED_TO_USER" ||
                    selectedStatuses[order.id] ===
                      "DELIVERED_AWAITING_RETURN" ||
                    order.status === "DELIVERED_AWAITING_RETURN" ||
                    selectedStatuses[order.id] === "SHIPPED_TO_LAB" ||
                    order.status === "SHIPPED_TO_LAB" ||
                    selectedStatuses[order.id] === "RECEIVED_IN_PROCESS" ||
                    order.status === "RECEIVED_IN_PROCESS") &&
                    selectedStatuses[order.id] !==
                      "COMPLETE_REPORT_DELIVERED" &&
                    order.status !== "COMPLETE_REPORT_DELIVERED" && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                          <label className="text-sm font-medium">
                            Outbound Tracking Number
                          </label>
                          <Input
                            name="outboundTrackingNumber"
                            placeholder="Enter outbound tracking number..."
                            value={
                              trackingNumbers[order.id]?.outbound ??
                              order.outboundTrackingNumber ??
                              ""
                            }
                            onChange={(e) =>
                              handleTrackingNumberChange(
                                order.id,
                                "outbound",
                                e.target.value
                              )
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">
                            Inbound Tracking Number
                          </label>
                          <Input
                            name="inboundTrackingNumber"
                            placeholder="Enter inbound tracking number..."
                            value={
                              trackingNumbers[order.id]?.inbound ??
                              order.inboundTrackingNumber ??
                              ""
                            }
                            onChange={(e) =>
                              handleTrackingNumberChange(
                                order.id,
                                "inbound",
                                e.target.value
                              )
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>
                    )}

                  {/* Kit-specific Report Uploads */}
                  <div>
                    <label className="text-sm font-medium">Kit Reports</label>
                    <div className="mt-2 space-y-3">
                      {order.kits.map((kit) => (
                        <div
                          key={kit.id}
                          className="border rounded-lg p-3 bg-gray-50 dark:bg-gray-900/50"
                        >
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-medium">
                                Kit {kit.kitNumber}
                              </span>
                              <Badge variant="outline" className="text-xs">
                                {kit.kitType}
                              </Badge>
                              {kit.child && (
                                <span className="text-xs text-muted-foreground">
                                  {kit.child.firstName || "Unknown"}{" "}
                                  {kit.child.lastName || "Name"}
                                </span>
                              )}
                            </div>
                            {kit.reportFileName && (
                              <Badge
                                variant="default"
                                className="text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                              >
                                Report Uploaded
                              </Badge>
                            )}
                          </div>

                          {/* Current Report Display */}
                          {kit.reportFileName && (
                            <div className="mb-2 p-2 bg-blue-50 dark:bg-blue-950/20 rounded-md border border-blue-200 dark:border-blue-800">
                              <p className="text-xs text-blue-700 dark:text-blue-300">
                                <span className="font-medium">
                                  Current report:
                                </span>{" "}
                                {kit.reportFileName.split("/").pop()}
                              </p>
                            </div>
                          )}

                          {/* File Upload */}
                          <div className="flex items-center gap-3">
                            <div className="flex-1">
                              <div className="relative">
                                <input
                                  type="file"
                                  name={`reportFile-${kit.id}`}
                                  accept=".pdf,.doc,.docx,.txt"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0] || null;
                                    setReportFiles((prev) => ({
                                      ...prev,
                                      [`${order.id}-${kit.id}`]: file,
                                    }));
                                  }}
                                  className="hidden"
                                  id={`file-${order.id}-${kit.id}`}
                                />
                                <label
                                  htmlFor={`file-${order.id}-${kit.id}`}
                                  className="flex items-center justify-between w-full px-3 py-2 border border-input bg-background text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer rounded-md hover:bg-accent hover:text-accent-foreground"
                                >
                                  <span className="text-muted-foreground text-xs">
                                    {reportFiles[`${order.id}-${kit.id}`]
                                      ?.name || "Choose a file..."}
                                  </span>
                                  <span className="bg-blue-50 text-blue-700 hover:bg-blue-100 dark:bg-blue-950/50 dark:text-blue-300 dark:hover:bg-blue-900/50 px-3 py-1 rounded-md text-xs font-medium">
                                    Browse
                                  </span>
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Selected File Display */}
                          {reportFiles[`${order.id}-${kit.id}`] && (
                            <div className="mt-2 p-2 bg-green-50 dark:bg-green-950/20 rounded-md border border-green-200 dark:border-green-800">
                              <p className="text-xs text-green-700 dark:text-green-300">
                                <span className="font-medium">Selected:</span>{" "}
                                {reportFiles[`${order.id}-${kit.id}`]?.name}
                              </p>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button
                      type="submit"
                      size="sm"
                      disabled={isUpdateDisabled(
                        order,
                        selectedStatuses[order.id] || order.status
                      )}
                    >
                      Update Order
                    </Button>
                    {(() => {
                      const message = getValidationMessage(
                        order,
                        selectedStatuses[order.id] || order.status
                      );
                      return (
                        message && (
                          <p className="text-xs text-amber-600 dark:text-amber-400 flex items-center gap-1">
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z"
                              />
                            </svg>
                            {message}
                          </p>
                        )
                      );
                    })()}
                  </div>
                </form>

                <form action={handleDeleteOrder}>
                  <input type="hidden" name="orderId" value={order.id} />
                  <Button
                    type="submit"
                    size="sm"
                    variant="destructive"
                    className="text-white"
                  >
                    Delete Order
                  </Button>
                </form>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  );
}
