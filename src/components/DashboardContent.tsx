"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserButton, useClerk } from "@clerk/nextjs";
import { format } from "date-fns";
import { Calendar, Clock, AlertCircle, CheckCircle, Trash2, Package, Download } from "lucide-react";
import OrderStatusCard from "@/components/OrderStatusCard";
import CalendlyModal from "@/components/CalendlyModal";
import UnbornChildDashboard from "@/components/UnbornChildDashboard";
import { useRouter } from "next/navigation";
import { formatLocalDate } from "@/lib/utils";
import { KitService } from "@/lib/kit-service";

type KitType = 'BASE' | 'PLUS' | 'PREMIUM';

interface DashboardContentProps {
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
      } | null;
}

// Function to format phone number for display
function formatPhoneForDisplay(phone: string): string {
  if (!phone) return 'Not provided';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle US phone numbers (10 digits)
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Handle US phone numbers with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    const withoutCountry = digits.slice(1);
    return `(${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6)}`;
  }
  
  // For other formats, return as is or with basic formatting
  if (digits.length > 0) {
    return phone; // Return original format if it's already formatted
  }
  
  return 'Not provided';
}

export default function DashboardContent({ user, order, orders }: DashboardContentProps) {
  const profile = user.profile;
  const consent = user.consents[0];
  const questionnaire = user.questionnaires[0];
  const { signOut } = useClerk();
  const router = useRouter();

  // Use orders array if provided, otherwise fall back to single order
  const allOrders = orders || (order ? [order] : []);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const selectedOrder = allOrders[selectedOrderIndex] || allOrders[0]; // Use selected order or fallback to first

  // Kit state
  const [kits, setKits] = useState<Kit[]>([]);
  const [loadingKits, setLoadingKits] = useState(false);

  // Calendly modal state
  const [calendlyModalOpen, setCalendlyModalOpen] = useState(false);
  const [calendlyType, setCalendlyType] = useState<'pre-test' | 'post-test'>('pre-test');
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

  // Get children associated with the selected order's kits
  const orderChildren = kits
    .filter(kit => kit.child)
    .map(kit => kit.child)
    .filter((child): child is NonNullable<typeof child> => child !== null);

  // Get the primary child for display
  // For unborn child orders, look for a child with dueDate but no firstName
  const unbornChild = orderChildren.find(child => 
    child.dueDate && !child.firstName && !child.lastName
  );
  
  // For regular orders, use the first child with firstName/lastName
  const regularChild = orderChildren.find(child => 
    child.firstName && child.lastName
  );
  
  const primaryChild = unbornChild || regularChild || orderChildren[0];

  // Determine if counseling prompts should be shown
  const showPreTestCounseling = user.preTestCounselingScheduled && !user.preTestCounselingDate;
  const showPostTestCounseling = user.postTestCounselingScheduled && !user.postTestCounselingDate;

  // Determine if this is a multi-kit order
  const isMultiKitOrder = kits.length > 1;

  const openCalendlyModal = (type: 'pre-test' | 'post-test') => {
    setCalendlyType(type);
    setCalendlyModalOpen(true);
  };

  const handleCalendlyClose = () => {
    setCalendlyModalOpen(false);
  };

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

  // Helper to get order status color
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
    // Check if it's a multi-kit order
    if (order.kitCount > 1) {
      return `Multi-Kit Order (${order.kitCount} kits)`;
    }
    
    // Default to order number for all orders
    return `Order ${index + 1}`;
  };

  // Check if the selected order is an unborn child order
  const isUnbornChildOrder = kits.some(kit => 
    // Either the kit has no child associated with it (unborn child not yet created)
    !kit.child ||
    // Or the kit has a child with only a due date (unborn child created during onboarding)
    (kit.child && kit.child.dueDate && !kit.child.firstName && !kit.child.lastName)
  );

  return (
    <div className="container-mobile container-tablet container-desktop">
      <div className="mobile-padding mobile-spacing">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Welcome back!
            </h1>
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

        {/* Unborn Child Dashboard for Unborn Child Orders */}
        {isUnbornChildOrder && (
          <div className="mb-6 sm:mb-8">
            <UnbornChildDashboard user={user} unbornChild={user.children.find((child: any) => 
              child.dueDate && !child.firstName && !child.lastName
            )} />
          </div>
        )}

        {/* Regular Dashboard Content - Only show for non-unborn child orders */}
        {!isUnbornChildOrder && (
          <>
            {/* Genetic Counseling Prompts */}
            {(showPreTestCounseling || showPostTestCounseling) && (
              <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
                {showPreTestCounseling && (
                  <Card className="w-full border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
                    <CardHeader className="pb-3 sm:pb-4">
                      <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-orange-800 dark:text-orange-200">
                        <AlertCircle className="w-5 h-5" />
                        Pre-Test Genetic Counseling Required
                      </CardTitle>
                      <CardDescription className="text-orange-700 dark:text-orange-300">
                        Schedule your pre-test genetic counseling session
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm sm:text-base text-orange-700 dark:text-orange-300 space-y-2">
                        <p>Pre-test genetic counseling helps you:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Understand what the genetic test will reveal</li>
                          <li>Discuss potential outcomes and their implications</li>
                          <li>Address any concerns or questions you may have</li>
                        </ul>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Button 
                          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={() => openCalendlyModal('pre-test')}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Pre-Test Counseling
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {showPostTestCounseling && (
                  <Card className="w-full border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                    <CardHeader className="pb-3 sm:pb-4">
                      <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-blue-800 dark:text-blue-200">
                        <Clock className="w-5 h-5" />
                        Post-Test Genetic Counseling Available
                      </CardTitle>
                      <CardDescription className="text-blue-700 dark:text-blue-300">
                        Your test results are ready. Schedule a post-test counseling session to discuss your results
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm sm:text-base text-blue-700 dark:text-blue-300 space-y-2">
                        <p>Post-test genetic counseling helps you:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>Understand your test results and their meaning</li>
                          <li>Discuss next steps and recommendations</li>
                          <li>Address any questions or concerns</li>
                          <li>Plan for your child's healthcare needs</li>
                        </ul>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Button 
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => openCalendlyModal('post-test')}
                        >
                          <Calendar className="w-4 h-4 mr-2" />
                          Schedule Post-Test Counseling
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}

            {/* Information Cards */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
              {/* Parent Information */}
              <Card className="w-full">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    Parent Information
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
                    <span className="font-medium text-sm sm:text-base">Phone:</span>
                    <span className="text-sm sm:text-base text-muted-foreground">
                      {formatPhoneForDisplay(profile?.phone)}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="font-medium text-sm sm:text-base">Address:</span>
                    <span className="text-sm sm:text-base text-muted-foreground">
                      {profile?.address ? (
                        <>
                          {profile.address}<br />
                          {profile.city}, {profile.state} {profile.zipCode}
                        </>
                      ) : (
                        'Not provided'
                      )}
                    </span>
                  </div>
                  {user.preTestCounselingScheduled && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="font-medium text-sm sm:text-base">Pre-Test Counseling:</span>
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {user.preTestCounselingDate ? (
                          formatLocalDate(user.preTestCounselingDate, 'MMM dd, yyyy, h:mm a')
                        ) : (
                          'Scheduled'
                        )}
                      </span>
                    </div>
                  )}
                  {user.postTestCounselingScheduled && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="font-medium text-sm sm:text-base">Post-Test Counseling:</span>
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {user.postTestCounselingDate ? (
                          formatLocalDate(user.postTestCounselingDate, 'MMM dd, yyyy, h:mm a')
                        ) : (
                          'Scheduled'
                        )}
                      </span>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Child Information */}
              <Card className="w-full">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    Child Information
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 sm:space-y-4">
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="font-medium text-sm sm:text-base">Name:</span>
                    <span className="text-sm sm:text-base text-muted-foreground">
                      {primaryChild?.firstName || 'Not provided'} {primaryChild?.lastName || ''}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="font-medium text-sm sm:text-base">Date of Birth:</span>
                    <span className="text-sm sm:text-base text-muted-foreground">
                      {primaryChild?.dob ? formatLocalDate(primaryChild.dob, 'MMM dd, yyyy') : 'Not provided'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="font-medium text-sm sm:text-base">Sex:</span>
                    <span className="text-sm sm:text-base text-muted-foreground">
                      {primaryChild?.sex || 'Not provided'}
                    </span>
                  </div>
                  <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                    <span className="font-medium text-sm sm:text-base">Ethnicities:</span>
                    <span className="text-sm sm:text-base text-muted-foreground">
                      {primaryChild?.ethnicities && primaryChild.ethnicities.length > 0 ? (
                        primaryChild.ethnicities.join(', ')
                      ) : (
                        'Not provided'
                      )}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Kit Cards for Multi-Kit Orders */}
            {isMultiKitOrder && (
              <div className="mb-6 sm:mb-8">
                <h2 className="text-xl font-semibold mb-4">Test Kits</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                  {kits.map((kit) => (
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
                        {kit.child ? (
                          <>
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                              <span className="font-medium text-sm sm:text-base">Child Name:</span>
                              <span className="text-sm sm:text-base text-muted-foreground">
                                {kit.child.firstName || 'Unknown'} {kit.child.lastName || 'Name'}
                              </span>
                            </div>
                            <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                              <span className="font-medium text-sm sm:text-base">Date of Birth:</span>
                              <span className="text-sm sm:text-base text-muted-foreground">
                                {kit.child.dob ? formatLocalDate(kit.child.dob, 'MMM dd, yyyy') : 'Not provided'}
                              </span>
                            </div>
                          </>
                        ) : (
                          <div className="text-sm text-muted-foreground">
                            Child information pending
                          </div>
                        )}
                        
                        {/* Report Download Section */}
                        {kit.reportFileName ? (
                          <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <CheckCircle className="w-4 h-4 text-green-600" />
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

            {/* Order Status Card - Show for selected order */}
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
                Update Information
              </Button>
              <Button className="w-full sm:w-auto">
                Contact Support
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
          </>
        )}
      </div>

      {/* Calendly Modal */}
      <CalendlyModal
        isOpen={calendlyModalOpen}
        onClose={handleCalendlyClose}
        type={calendlyType}
        userEmail={user.email}
        userName={`${profile?.firstName} ${profile?.lastName}`}
      />
    </div>
  );
} 