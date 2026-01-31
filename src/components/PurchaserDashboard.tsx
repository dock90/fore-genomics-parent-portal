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
import { Clock, Package, Eye, Mail, CheckCircle } from "lucide-react";
import OrderStatusCard from "@/components/OrderStatusCard";
import { formatLocalDate } from "@/lib/utils";

interface PurchaserDashboardProps {
  user: any;
  order?: any;
  orders?: any[];
}

interface ParentInvitation {
  id: string;
  orderId: string;
  status: "PENDING" | "ACCEPTED" | "EXPIRED" | "DECLINED";
  expiresAt: Date;
  acceptedAt?: Date;
  createdAt: Date;
  order: {
    parent?: {
      email: string;
      profile?: {
        firstName: string | null;
        lastName: string | null;
      };
    } | null;
    purchaser: {
      email: string;
      profile?: {
        firstName: string | null;
        lastName: string | null;
      };
    };
    kits: {
      child?: {
        firstName: string | null;
        lastName: string | null;
        dob: string | null;
        sex: string | null;
        ethnicities: string[];
      } | null;
    }[];
  };
}

export default function PurchaserDashboard({
  user,
  order,
  orders,
}: PurchaserDashboardProps) {
  const profile = user.profile;

  // Filter orders where user is purchaser but not parent
  const purchaserOnlyOrders = (orders || (order ? [order] : [])).filter(
    (order: any) => order.purchaserId === user.id && order.parentId !== user.id
  );

  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const selectedOrder =
    purchaserOnlyOrders[selectedOrderIndex] || purchaserOnlyOrders[0];

  // State for invitations and resend functionality
  const [invitations, setInvitations] = useState<ParentInvitation[]>([]);
  const [loadingInvitations, setLoadingInvitations] = useState(false);
  const [resendingInvitation, setResendingInvitation] = useState<string | null>(
    null
  );

  // Fetch invitations for the selected order
  useEffect(() => {
    const fetchInvitations = async () => {
      if (!selectedOrder?.id) return;

      setLoadingInvitations(true);
      try {
        const response = await fetch(
          `/api/orders/${selectedOrder.id}/invitations`
        );
        if (response.ok) {
          const invitationsData = await response.json();
          setInvitations(invitationsData);
        }
      } catch (error) {
      } finally {
        setLoadingInvitations(false);
      }
    };

    fetchInvitations();
  }, [selectedOrder?.id]);

  const handleResendInvitation = async (invitationId: string) => {
    setResendingInvitation(invitationId);

    try {
      const response = await fetch(`/api/onboarding/resend-invitation`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ invitationId }),
      });

      if (response.ok) {
        // Refresh invitations to get updated status
        const refreshResponse = await fetch(
          `/api/orders/${selectedOrder.id}/invitations`
        );
        if (refreshResponse.ok) {
          const invitationsData = await refreshResponse.json();
          setInvitations(invitationsData);
        }
      } else {
      }
    } catch (error) {
    } finally {
      setResendingInvitation(null);
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case "ORDER_RECEIVED":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "ONBOARDING_COMPLETED":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PREPARING_ORDER":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "SHIPPED_TO_USER":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "DELIVERED_AWAITING_RETURN":
        return "bg-indigo-100 text-indigo-800 border-indigo-200";
      case "SHIPPED_TO_LAB":
        return "bg-pink-100 text-pink-800 border-pink-200";
      case "RECEIVED_IN_PROCESS":
        return "bg-teal-100 text-teal-800 border-teal-200";
      case "COMPLETE_REPORT_DELIVERED":
        return "bg-green-100 text-green-800 border-green-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  const getOrderDisplayName = (order: any, index: number) => {
    if (order.kitCount > 1) {
      return `Multi-Kit Order (${order.kitCount} kits)`;
    }
    return `Order ${index + 1}`;
  };

  const getInvitationStatusColor = (status: string) => {
    switch (status) {
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      case "ACCEPTED":
        return "bg-green-100 text-green-800 border-green-200";
      case "EXPIRED":
        return "bg-red-100 text-red-800 border-red-200";
      case "DECLINED":
        return "bg-gray-100 text-gray-800 border-gray-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  // If no purchaser-only orders, show a message
  if (purchaserOnlyOrders.length === 0) {
    return (
      <div className="container-mobile container-tablet container-desktop">
        <div className="mobile-padding mobile-spacing">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
            <div>
              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
                Welcome, {profile?.firstName}!
              </h1>
            </div>
          </div>

          <Card className="w-full">
            <CardContent className="p-6 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
              <h3 className="text-lg font-medium mb-2">No Purchased Orders</h3>
              <p className="text-muted-foreground">
                You don't have any orders where you are the purchaser but not
                the parent. This dashboard shows orders you've purchased for
                other people.
              </p>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile container-tablet container-desktop">
      <div className="mobile-padding mobile-spacing">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Welcome, {profile?.firstName}!
            </h1>
          </div>

          {/* Order Selector - Only show if multiple orders */}
          {purchaserOnlyOrders.length > 1 && (
            <div className="flex items-center gap-2">
              <label
                htmlFor="order-select"
                className="text-sm font-medium text-muted-foreground"
              >
                Select Order:
              </label>
              <select
                id="order-select"
                value={selectedOrderIndex}
                onChange={(e) => setSelectedOrderIndex(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {purchaserOnlyOrders.map((order, index) => (
                  <option key={order.id} value={index}>
                    {getOrderDisplayName(order, index)} - {order.orderNumber}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Purchaser Information */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          <Card className="w-full">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                User Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Name:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {profile?.firstName} {profile?.lastName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Email:</span>
                <span className="text-sm sm:text-base text-muted-foreground break-all">
                  {user.email}
                </span>
              </div>
            </CardContent>
          </Card>

          {/* Order Summary */}
          <Card className="w-full">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                Order Summary
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">
                  Order Number:
                </span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {selectedOrder?.orderNumber}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">
                  Total Kits:
                </span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {selectedOrder?.kitCount}
                </span>
              </div>
              {selectedOrder?.parent && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">
                    Parent:
                  </span>
                  <span className="text-sm sm:text-base text-muted-foreground">
                    {selectedOrder.parent.profile?.firstName}{" "}
                    {selectedOrder.parent.profile?.lastName} (
                    {selectedOrder.parent.email})
                  </span>
                </div>
              )}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">
                  Pending Invitations:
                </span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {invitations.filter((inv) => inv.status === "PENDING").length}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">
                  Accepted Invitations:
                </span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {
                    invitations.filter((inv) => inv.status === "ACCEPTED")
                      .length
                  }
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Invitations Section */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl font-semibold mb-4">Parent Invitations</h2>

          {loadingInvitations ? (
            <Card className="w-full">
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading invitations...</p>
              </CardContent>
            </Card>
          ) : invitations.length > 0 ? (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {invitations.map((invitation) => (
                <Card key={invitation.id} className="w-full">
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                      <Mail className="w-5 h-5" />
                      Invitation for{" "}
                      {invitation.order.kits[0]?.child?.firstName}{" "}
                      {invitation.order.kits[0]?.child?.lastName}
                    </CardTitle>
                    <CardDescription>
                      Sent to {invitation.order.parent?.profile?.firstName}{" "}
                      {invitation.order.parent?.profile?.lastName} (
                      {invitation.order.parent?.email})
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    {/* Child Information */}
                    <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                      <div className="flex items-center gap-2 mb-2">
                        <Eye className="w-4 h-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                          Child Information
                        </span>
                      </div>
                      <div className="text-sm text-blue-600 dark:text-blue-400">
                        <div>
                          Name: {invitation.order.kits[0]?.child?.firstName}{" "}
                          {invitation.order.kits[0]?.child?.lastName}
                        </div>
                        <div>
                          DOB:{" "}
                          {invitation.order.kits[0]?.child?.dob
                            ? formatLocalDate(invitation.order.kits[0].child.dob)
                            : "Not provided"}
                        </div>
                        <div>Sex: {invitation.order.kits[0]?.child?.sex}</div>
                        <div>
                          Ethnicity:{" "}
                          {invitation.order.kits[0]?.child?.ethnicities?.join(
                            ", "
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Invitation Status */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {invitation.status === "ACCEPTED" ? (
                          <CheckCircle className="w-4 h-4 text-green-600" />
                        ) : (
                          <Clock className="w-4 h-4 text-yellow-600" />
                        )}
                        <Badge
                          className={getInvitationStatusColor(
                            invitation.status
                          )}
                        >
                          {invitation.status}
                        </Badge>
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {invitation.status === "ACCEPTED" &&
                        invitation.acceptedAt
                          ? `Accepted ${formatLocalDate(invitation.acceptedAt.toISOString())}`
                          : `Expires ${formatLocalDate(invitation.expiresAt.toISOString())}`}
                      </div>
                    </div>

                    {/* Resend Button - Only show for pending invitations */}
                    {invitation.status === "PENDING" && (
                      <Button
                        onClick={() => handleResendInvitation(invitation.id)}
                        disabled={resendingInvitation === invitation.id}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        <Mail className="w-4 h-4 mr-2" />
                        {resendingInvitation === invitation.id
                          ? "Resending..."
                          : "Resend Invitation"}
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card className="w-full">
              <CardContent className="p-6 text-center">
                <Mail className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">
                  No Invitations Found
                </h3>
                <p className="text-muted-foreground">
                  No parent invitations are associated with this order.
                </p>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Order Status Card */}
        {selectedOrder && (
          <div className="mb-6 sm:mb-8">
            <div className="border rounded-lg p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium">
                  {getOrderDisplayName(selectedOrder, selectedOrderIndex)} -{" "}
                  {selectedOrder.orderNumber}
                </h3>
                <Badge className={getOrderStatusColor(selectedOrder.status)}>
                  {selectedOrder.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <OrderStatusCard order={selectedOrder} />
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Button variant="outline" className="w-full sm:w-auto">
            Contact Support
          </Button>
          <Button className="w-full sm:w-auto">View Order Details</Button>
        </div>
      </div>
    </div>
  );
}
