"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Package, Download, Users, Eye, Trash2 } from "lucide-react";
import OrderStatusCard from "@/components/OrderStatusCard";
import { formatLocalDate } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";

type KitType = 'BASE' | 'PLUS' | 'PREMIUM';

interface PurchaserDashboardProps {
  user: any;
  order?: any;
  orders?: any[];
}

interface Kit {
  id: string;
  kitNumber: number;
  kitType: KitType;
  status: string;
  reportFileName?: string | null;
  childId: string | null;
  consentId: string | null;
  questionnaireId: string | null;
  child?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    dob: string | null;
    dueDate?: string | null;
    sex?: string | null;
    ethnicities?: string[];
    user?: {
      id: string;
      email: string;
      profile?: {
        firstName: string | null;
        lastName: string | null;
      };
    };
  } | null;
}

export default function PurchaserDashboard({ user, order, orders }: PurchaserDashboardProps) {
  const profile = user.profile;
  const { signOut } = useClerk();

  // Use orders array if provided, otherwise fall back to single order
  const allOrders = orders || (order ? [order] : []);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const selectedOrder = allOrders[selectedOrderIndex] || allOrders[0];

  // Kit state
  const [kits, setKits] = useState<Kit[]>([]);
  const [loadingKits, setLoadingKits] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [downloadingReports, setDownloadingReports] = useState<{[kitId: string]: boolean}>({});

  // Fetch kits for the selected order
  useEffect(() => {
    const fetchKits = async () => {
      if (!selectedOrder?.id) return;
      
      setLoadingKits(true);
      try {
        const response = await fetch(`/api/orders/${selectedOrder.id}/kits`);
        if (response.ok) {
          const kitsData = await response.json();
          setKits(kitsData);
        }
      } catch (error) {
        console.error('Error fetching kits:', error);
      } finally {
        setLoadingKits(false);
      }
    };

    fetchKits();
  }, [selectedOrder?.id]);

  const handleDownloadReport = async (kitId: string, reportFileName: string) => {
    setDownloadingReports(prev => ({ ...prev, [kitId]: true }));
    
    try {
      const response = await fetch(`/api/reports/download?kitId=${kitId}&reportFileName=${reportFileName}`);
      
      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = reportFileName;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert('Failed to download report');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Error downloading report');
    } finally {
      setDownloadingReports(prev => ({ ...prev, [kitId]: false }));
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      return;
    }
    
    setIsResetting(true);
    try {
      const response = await fetch('/api/user/reset', { method: 'DELETE' });
      if (response.ok) {
        await signOut();
      }
    } catch (error) {
      console.error('Error resetting user data:', error);
      setIsResetting(false);
    }
  };

  const getKitTypeDisplayName = (kitType: KitType) => {
    switch (kitType) {
      case 'BASE':
        return 'Base Kit';
      case 'PLUS':
        return 'Plus Kit';
      case 'PREMIUM':
        return 'Premium Kit';
      default:
        return kitType;
    }
  };

  const getKitTypeColor = (kitType: KitType) => {
    switch (kitType) {
      case 'BASE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PLUS':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'PREMIUM':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOrderStatusColor = (status: string) => {
    switch (status) {
      case 'ORDER_RECEIVED':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'ONBOARDING_COMPLETED':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PREPARING_ORDER':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'SHIPPED_TO_USER':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'DELIVERED_AWAITING_RETURN':
        return 'bg-indigo-100 text-indigo-800 border-indigo-200';
      case 'SHIPPED_TO_LAB':
        return 'bg-pink-100 text-pink-800 border-pink-200';
      case 'RECEIVED_IN_PROCESS':
        return 'bg-teal-100 text-teal-800 border-teal-200';
      case 'COMPLETE_REPORT_DELIVERED':
        return 'bg-green-100 text-green-800 border-green-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getOrderDisplayName = (order: any, index: number) => {
    if (order.kitCount > 1) {
      return `Multi-Kit Order (${order.kitCount} kits)`;
    }
    return `Order ${index + 1}`;
  };

  // Get kits with assigned children (kits that have been transferred to parents)
  const assignedKits = kits.filter(kit => kit.child);
  const unassignedKits = kits.filter(kit => !kit.child);

  // Get unique parents from assigned kits
  const uniqueParents = assignedKits
    .map(kit => kit.child?.user)
    .filter((user, index, self) => 
      user && self.findIndex(u => u?.id === user.id) === index
    );

  return (
    <div className="container-mobile container-tablet container-desktop">
      <div className="mobile-padding mobile-spacing">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Purchaser Dashboard
            </h1>
            <p className="text-muted-foreground mt-2">
              Track your purchased kits and their status
            </p>
          </div>
          
          {/* Order Selector - Only show if multiple orders */}
          {allOrders.length > 1 && (
            <div className="flex items-center gap-2">
              <label htmlFor="order-select" className="text-sm font-medium text-muted-foreground">
                Select Order:
              </label>
              <select
                id="order-select"
                value={selectedOrderIndex}
                onChange={(e) => setSelectedOrderIndex(Number(e.target.value))}
                className="px-3 py-2 border border-gray-300 rounded-md bg-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                {allOrders.map((order, index) => (
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
                Purchaser Information
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
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Role:</span>
                <Badge className="bg-blue-100 text-blue-800 border-blue-200">
                  Purchaser
                </Badge>
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
                <span className="font-medium text-sm sm:text-base">Total Kits:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {kits.length}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Assigned to Parents:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {assignedKits.length}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Pending Assignment:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {unassignedKits.length}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Unique Parents:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {uniqueParents.length}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Kit Status Overview */}
        <div className="mb-6 sm:mb-8">
          <h2 className="text-xl font-semibold mb-4">Kit Status Overview</h2>
          
          {/* Assigned Kits */}
          {assignedKits.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Users className="w-5 h-5" />
                Kits Assigned to Parents ({assignedKits.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {assignedKits.map((kit) => (
                  <Card key={kit.id} className="w-full">
                    <CardHeader className="pb-3 sm:pb-4">
                      <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Kit #{kit.kitNumber}
                      </CardTitle>
                      <CardDescription>
                        {getKitTypeDisplayName(kit.kitType)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      {/* Parent Information */}
                      {kit.child?.user && (
                        <div className="bg-blue-50 dark:bg-blue-950/20 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Users className="w-4 h-4 text-blue-600" />
                            <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                              Assigned to Parent
                            </span>
                          </div>
                          <div className="text-sm text-blue-600 dark:text-blue-400">
                            <div>{kit.child.user.profile?.firstName} {kit.child.user.profile?.lastName}</div>
                            <div>{kit.child.user.email}</div>
                          </div>
                        </div>
                      )}

                      {/* Child Information */}
                      {kit.child && (
                        <div className="bg-green-50 dark:bg-green-950/20 p-3 rounded-lg">
                          <div className="flex items-center gap-2 mb-2">
                            <Eye className="w-4 h-4 text-green-600" />
                            <span className="text-sm font-medium text-green-700 dark:text-green-300">
                              Child Information
                            </span>
                          </div>
                          <div className="text-sm text-green-600 dark:text-green-400">
                            <div>{kit.child.firstName} {kit.child.lastName}</div>
                            <div>DOB: {kit.child.dob ? formatLocalDate(kit.child.dob, 'MMM dd, yyyy') : 'Not provided'}</div>
                            <div>Sex: {kit.child.sex || 'Not provided'}</div>
                          </div>
                        </div>
                      )}
                      
                      {/* Report Download Section */}
                      {kit.reportFileName ? (
                        <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Download className="w-4 h-4 text-green-600" />
                              <span className="text-sm font-medium text-green-700 dark:text-green-300">
                                Report Available
                              </span>
                            </div>
                            <Button
                              size="sm"
                              onClick={() => handleDownloadReport(kit.id, kit.reportFileName!)}
                              disabled={downloadingReports[kit.id]}
                              className="bg-green-600 hover:bg-green-700 text-white"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              {downloadingReports[kit.id] ? 'Downloading...' : 'Download Report'}
                            </Button>
                          </div>
                        </div>
                      ) : null}
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* Unassigned Kits */}
          {unassignedKits.length > 0 && (
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3 flex items-center gap-2">
                <Clock className="w-5 h-5" />
                Kits Pending Assignment ({unassignedKits.length})
              </h3>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {unassignedKits.map((kit) => (
                  <Card key={kit.id} className="w-full border-yellow-200 bg-yellow-50 dark:border-yellow-800 dark:bg-yellow-950/20">
                    <CardHeader className="pb-3 sm:pb-4">
                      <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                        <Package className="w-5 h-5" />
                        Kit #{kit.kitNumber}
                      </CardTitle>
                      <CardDescription>
                        {getKitTypeDisplayName(kit.kitType)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-3 sm:space-y-4">
                      <div className="bg-yellow-100 dark:bg-yellow-900/20 p-3 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-yellow-600" />
                          <span className="text-sm font-medium text-yellow-700 dark:text-yellow-300">
                            Awaiting Parent Assignment
                          </span>
                        </div>
                        <p className="text-sm text-yellow-600 dark:text-yellow-400 mt-1">
                          This kit is ready to be assigned to a parent or guardian for onboarding.
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          {/* No Kits Message */}
          {kits.length === 0 && !loadingKits && (
            <Card className="w-full">
              <CardContent className="p-6 text-center">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-400" />
                <h3 className="text-lg font-medium mb-2">No Kits Found</h3>
                <p className="text-muted-foreground">
                  No kits are associated with this order.
                </p>
              </CardContent>
            </Card>
          )}

          {/* Loading State */}
          {loadingKits && (
            <Card className="w-full">
              <CardContent className="p-6 text-center">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-muted-foreground">Loading kits...</p>
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
                  {getOrderDisplayName(selectedOrder, selectedOrderIndex)} - {selectedOrder.orderNumber}
                </h3>
                <Badge className={getOrderStatusColor(selectedOrder.status)}>
                  {selectedOrder.status.replace(/_/g, ' ')}
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
          <Button className="w-full sm:w-auto">
            View Order Details
          </Button>
        </div>

        {/* Testing Reset Button - Only show in staging */}
        {process.env.NEXT_PUBLIC_TEST_MODE === 'true' && (
          <Card className="w-full mt-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-red-700 dark:text-red-300">
                <Trash2 className="h-5 w-5" />
                Testing - Reset User Data
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-red-600 dark:text-red-400 mb-4">
                This will permanently delete all your data, including your Clerk account, and log you out.
              </p>
              <Button 
                onClick={handleReset}
                disabled={isResetting}
                variant="destructive"
                className="w-full"
              >
                {isResetting ? "Deleting..." : "Delete All Data & Sign Out"}
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
} 