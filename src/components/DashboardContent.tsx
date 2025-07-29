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
import { useRouter } from "next/navigation";
import { formatLocalDate } from "@/lib/utils";
import { KitService } from "@/lib/kit-service";

type KitType = 'BASE' | 'PLUS' | 'PREMIUM';

interface DashboardContentProps {
  user: any;
  order?: any;
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

export default function DashboardContent({ user, order }: DashboardContentProps) {
  const profile = user.profile;
  const child = user.children[0];
  const consent = user.consents[0];
  const questionnaire = user.questionnaires[0];
  const { signOut } = useClerk();
  const router = useRouter();

  // Kit state
  const [kits, setKits] = useState<Kit[]>([]);
  const [loadingKits, setLoadingKits] = useState(false);

  // Calendly modal state
  const [calendlyModalOpen, setCalendlyModalOpen] = useState(false);
  const [calendlyType, setCalendlyType] = useState<'pre-test' | 'post-test'>('pre-test');
  const [isResetting, setIsResetting] = useState(false);
  const [downloadingReports, setDownloadingReports] = useState<{[kitId: string]: boolean}>({});

  // Fetch kits for the order
  useEffect(() => {
    const fetchKits = async () => {
      if (!order?.id) return;
      
      setLoadingKits(true);
      try {
        const response = await fetch(`/api/orders/${order.id}/kits`);
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
  }, [order?.id]);

  // Determine if counseling prompts should be shown
  const showPreTestCounseling = !user.preTestCounselingScheduled;
  const showPostTestCounseling = user.postTestCounselingScheduled === false && 
    order?.status === 'COMPLETE_REPORT_DELIVERED';

  // Check if this is a multi-kit order
  const isMultiKitOrder = kits.length > 1;

  // Handle opening Calendly modal
  const openCalendlyModal = (type: 'pre-test' | 'post-test') => {
    setCalendlyType(type);
    setCalendlyModalOpen(true);
  };

  // Handle closing Calendly modal and refresh data
  const handleCalendlyClose = () => {
    setCalendlyModalOpen(false);
    // Refresh the page to get updated counseling status
    window.location.reload();
  };

  // Handle downloading reports
  const handleDownloadReport = async (kitId: string, reportFileName: string) => {
    setDownloadingReports(prev => ({ ...prev, [kitId]: true }));
    
    try {
      const response = await fetch('/api/reports/download', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ fileName: reportFileName }),
      });

      if (response.ok) {
        const { downloadUrl } = await response.json();
        
        // Create a temporary link and trigger download
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = reportFileName.split('/').pop() || 'genetic-report.pdf';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      } else {
        console.error('Failed to get download URL');
        alert('Failed to download report. Please try again.');
      }
    } catch (error) {
      console.error('Error downloading report:', error);
      alert('Error downloading report. Please try again.');
    } finally {
      setDownloadingReports(prev => ({ ...prev, [kitId]: false }));
    }
  };

  // Handle reset user data
  const handleReset = async () => {
    if (!confirm('Are you sure you want to delete all your data? This action cannot be undone.')) {
      return;
    }

    // Navigate to client-side reset page
    router.push('/reset');
  };

  // Helper to get kit type display name
  const getKitTypeDisplayName = (kitType: KitType) => {
    switch (kitType) {
      case 'BASE':
        return 'Base Kit';
      case 'PLUS':
        return 'Plus Kit';
      case 'PREMIUM':
        return 'Premium Kit';
      default:
        return 'Unknown Kit';
    }
  };

  // Helper to get kit type color
  const getKitTypeColor = (kitType: KitType) => {
    switch (kitType) {
      case 'BASE':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'PLUS':
        return 'bg-purple-100 text-purple-800 border-purple-200';
      case 'PREMIUM':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };


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
        </div>

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
                      <span className="text-muted-foreground">Not scheduled</span>
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Child Information - Show for single kit orders */}
          {!isMultiKitOrder && child && (
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
                    {child?.firstName} {child?.lastName}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">Date of Birth:</span>
                  <span className="text-sm sm:text-base text-muted-foreground">
                    {child?.dob ? formatLocalDate(child.dob, 'MMM dd, yyyy') : 'Not provided'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">Sex:</span>
                  <span className="text-sm sm:text-base text-muted-foreground">
                    {child?.sex || 'Not provided'}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">Ethnicity:</span>
                  <span className="text-sm sm:text-base text-muted-foreground">
                    {child?.ethnicities && child.ethnicities.length > 0 
                      ? child.ethnicities.join(', ') 
                      : 'Not provided'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )}
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

        {/* Order Status Card - Show for single kit orders or overall order status */}
        {order && (
          <div className="mb-6 sm:mb-8">
            <OrderStatusCard order={order} />
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