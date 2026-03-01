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
import {
  Calendar,
  Clock,
  AlertCircle,
  CheckCircle,
  Package,
  Download,
  User,
  Baby,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import OrderStatusCard from "@/components/OrderStatusCard";
import CalendlyModal from "@/components/CalendlyModal";
import { formatLocalDate, dateFormats } from "@/lib/utils";
import { isFeatureEnabled } from "@/lib/feature-flags";

type KitType = "BASE" | "PLUS" | "PREMIUM";

interface DashboardContentProps {
  user: any;
  order?: any;
  orders?: any[];
}

interface Kit {
  id: string;
  kitNumber: number;
  kitType: KitType;
  reportFileName?: string | null;
  parentReportFileName?: string | null;
  pediatricianReportFileName?: string | null;
  fullLabReportFileName?: string | null;
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
  order: {
    id: string;
    status: string;
  };
}

interface ReportInfo {
  label: string;
  fileName: string;
}

// Function to format phone number for display
function formatPhoneForDisplay(phone: string): string {
  if (!phone) return "Not provided";

  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, "");

  // Handle US phone numbers (10 digits)
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  // Handle US phone numbers with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith("1")) {
    const withoutCountry = digits.slice(1);
    return `(${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6)}`;
  }

  // For other formats, return as is or with basic formatting
  if (digits.length > 0) {
    return phone; // Return original format if it's already formatted
  }

  return "Not provided";
}

export default function DashboardContent({
  user,
  order,
  orders,
}: DashboardContentProps) {
  const profile = user.profile;

  // Use orders array if provided, otherwise fall back to single order
  const allOrders = orders || (order ? [order] : []);
  const [selectedOrderIndex, setSelectedOrderIndex] = useState(0);
  const selectedOrder = allOrders[selectedOrderIndex] || allOrders[0]; // Use selected order or fallback to first

  // Kit state
  const [kits, setKits] = useState<Kit[]>([]);
  const [loadingKits, setLoadingKits] = useState(false);

  // Calendly modal state
  const [calendlyModalOpen, setCalendlyModalOpen] = useState(false);
  const [calendlyType, setCalendlyType] = useState<"pre-test" | "post-test">(
    "pre-test"
  );
  const [downloadingReports, setDownloadingReports] = useState<{
    [key: string]: boolean;
  }>({});

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
      } finally {
        setLoadingKits(false);
      }
    };

    fetchKits();
  }, [selectedOrder?.id]);

  // Get children associated with the selected order's kits
  const orderChildren = kits
    .filter((kit) => kit.child)
    .map((kit) => kit.child)
    .filter((child): child is NonNullable<typeof child> => child !== null);

  // Get the primary child for display
  // For unborn child orders, look for a child with dueDate but no firstName
  // const unbornChild = orderChildren.find(
  //   (child) => child.dueDate && !child.firstName && !child.lastName
  // );

  // Determine if counseling prompts should be shown
  const showPreTestCounseling =
    !selectedOrder?.preTestCounselingDate &&
    !selectedOrder?.preTestCounselingEventId;
  const showPostTestCounseling =
    selectedOrder.status === "COMPLETE_REPORT_DELIVERED" &&
    !selectedOrder?.postTestCounselingEventId &&
    !selectedOrder?.postTestCounselingDate;

  const openCalendlyModal = (type: "pre-test" | "post-test") => {
    setCalendlyType(type);
    setCalendlyModalOpen(true);
  };

  const handleCalendlyClose = () => {
    setCalendlyModalOpen(false);
  };

  const handleDownloadReport = async (
    downloadKey: string,
    kitId: string,
    reportFileName: string
  ) => {
    setDownloadingReports((prev) => ({ ...prev, [downloadKey]: true }));

    try {
      const response = await fetch("/api/reports/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ kitId, fileName: reportFileName }),
      });

      if (response.ok) {
        const { downloadUrl } = await response.json();

        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = reportFileName || "report.pdf";
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
    } finally {
      setDownloadingReports((prev) => ({ ...prev, [downloadKey]: false }));
    }
  };

  const getAvailableReports = (kit: Kit): ReportInfo[] => {
    const reports: ReportInfo[] = [];
    if (kit.parentReportFileName) {
      reports.push({ label: "Parent Report", fileName: kit.parentReportFileName });
    }
    if (kit.pediatricianReportFileName) {
      reports.push({ label: "Pediatrician Report", fileName: kit.pediatricianReportFileName });
    }
    if (kit.fullLabReportFileName) {
      reports.push({ label: "Full Lab Report", fileName: kit.fullLabReportFileName });
    }
    if (kit.reportFileName) {
      reports.push({ label: "Report (Original)", fileName: kit.reportFileName });
    }
    return reports;
  };

  const getKitTypeDisplayName = (kitType: KitType) => {
    switch (kitType) {
      case "BASE":
        return "Base Kit";
      case "PLUS":
        return "Plus Kit";
      case "PREMIUM":
        return "Premium Kit";
      default:
        return kitType;
    }
  };

  // const getKitTypeColor = (kitType: KitType) => {
  //   switch (kitType) {
  //     case "BASE":
  //       return "bg-blue-100 text-blue-800 border-blue-200";
  //     case "PLUS":
  //       return "bg-green-100 text-green-800 border-green-200";
  //     case "PREMIUM":
  //       return "bg-purple-100 text-purple-800 border-purple-200";
  //     default:
  //       return "bg-gray-100 text-gray-800 border-gray-200";
  //   }
  // };

  const getOrderDisplayName = (order: any, index: number) => {
    // Check if it's a multi-kit order
    if (order.kitCount > 1) {
      return `Multi-Kit Order (${order.kitCount} kits)`;
    }

    // Default to order number for all orders
    return `Order ${index + 1}`;
  };

  // Helper to check if a child is unborn
  const isUnbornChild = (child: any) => 
    child && child.dueDate && !child.firstName && !child.lastName;

  return (
    <div className="transition-opacity duration-500">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
            Welcome back{profile?.firstName ? `, ${profile.firstName}` : ""}!
          </h1>
          <p className="text-muted-foreground mt-1">
            Track your order status and view your information
          </p>
        </div>

        {/* Order Selector - Only show if multiple orders */}
        {allOrders.length > 1 && (
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
              className="px-4 py-2 border border-input rounded-lg bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring focus:border-transparent transition-colors"
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

      {/* Dashboard Content - Always show */}
      <>
          {/* Genetic Counseling Prompts */}
          {isFeatureEnabled("CALENDLY_INTEGRATION") &&
            (showPreTestCounseling || showPostTestCounseling) && (
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
                          <li>
                            Discuss potential outcomes and their implications
                          </li>
                          <li>
                            Address any concerns or questions you may have
                          </li>
                        </ul>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Button
                          className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                          onClick={() => openCalendlyModal("pre-test")}
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
                        Your test results are ready. Schedule a post-test
                        counseling session to discuss your results
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="text-sm sm:text-base text-blue-700 dark:text-blue-300 space-y-2">
                        <p>Post-test genetic counseling helps you:</p>
                        <ul className="list-disc list-inside space-y-1 ml-4">
                          <li>
                            Understand your test results and their meaning
                          </li>
                          <li>Discuss next steps and recommendations</li>
                          <li>Address any questions or concerns</li>
                          <li>Plan for your child's healthcare needs</li>
                        </ul>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                        <Button
                          className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                          onClick={() => openCalendlyModal("post-test")}
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

          {/* Parent Information */}
          <div className="mb-8">
            <Card className="w-full">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-primary/10">
                    <User className="h-5 w-5 text-primary" />
                  </div>
                  Your Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Name</span>
                    <p className="text-sm sm:text-base font-medium mt-1">
                      {profile?.firstName} {profile?.lastName}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Email</span>
                    <p className="text-sm sm:text-base mt-1 break-all">
                      {user.email}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Phone</span>
                    <p className="text-sm sm:text-base mt-1">
                      {formatPhoneForDisplay(profile?.phone)}
                    </p>
                  </div>
                  <div>
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Address</span>
                    <p className="text-sm sm:text-base mt-1">
                      {profile?.address ? (
                        <>
                          {profile.address}
                          {profile.addressLine2 && `, ${profile.addressLine2}`}
                          <br />
                          {profile.city}, {profile.state} {profile.zipCode}
                        </>
                      ) : (
                        <span className="text-muted-foreground">Not provided</span>
                      )}
                    </p>
                  </div>
                  {isFeatureEnabled("CALENDLY_INTEGRATION") &&
                    selectedOrder?.preTestCounselingEventId && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Pre-Test Counseling</span>
                        <p className="text-sm sm:text-base mt-1">
                          {selectedOrder.preTestCounselingDate
                            ? dateFormats.shortWithTime(new Date(selectedOrder.preTestCounselingDate))
                            : "Scheduled"}
                        </p>
                      </div>
                    )}
                  {isFeatureEnabled("CALENDLY_INTEGRATION") &&
                    selectedOrder?.postTestCounselingEventId && (
                      <div>
                        <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Post-Test Counseling</span>
                        <p className="text-sm sm:text-base mt-1">
                          {selectedOrder.postTestCounselingDate
                            ? dateFormats.shortWithTime(new Date(selectedOrder.postTestCounselingDate))
                            : "Scheduled"}
                        </p>
                      </div>
                    )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Child Information */}
          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Baby className="h-5 w-5 text-pink-500" />
              Child Information
            </h2>
            {orderChildren.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {orderChildren.map((child, idx) => {
                  const isUnborn = isUnbornChild(child);
                  return (
                    <Card 
                      className="w-full" 
                      key={child.id || idx}
                    >
                      <CardHeader className="pb-4">
                        <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                          <div className={`p-2 rounded-lg ${isUnborn ? 'bg-secondary' : 'bg-pink-500/10'}`}>
                            {isUnborn ? (
                              <Clock className="h-5 w-5 text-fore-teal" />
                            ) : (
                              <Baby className="h-5 w-5 text-pink-500" />
                            )}
                          </div>
                          {isUnborn ? "Awaiting Arrival" : `${child.firstName || "Child"} ${child.lastName || ""}`}
                          {orderChildren.length > 1 && !isUnborn && (
                            <span className="text-sm font-normal text-muted-foreground ml-auto">
                              #{idx + 1}
                            </span>
                          )}
                          {isUnborn && (
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground ml-auto">
                              Pending
                            </span>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {isUnborn ? (
                          <div className="space-y-3">
                            <div className="flex items-center gap-3 p-4 rounded-lg bg-secondary">
                              <Calendar className="h-5 w-5 text-fore-teal" />
                              <div>
                                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Due Date</span>
                                <p className="text-base font-semibold text-foreground">
                                  {child.dueDate
                                    ? formatLocalDate(child.dueDate)
                                    : "Not provided"}
                                </p>
                              </div>
                            </div>
                            <p className="text-sm text-muted-foreground">
                              We&apos;ll contact you after your due date to complete the onboarding process.
                            </p>
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Date of Birth</span>
                              <p className="text-sm sm:text-base mt-1">
                                {child.dob
                                  ? formatLocalDate(child.dob)
                                  : "Not provided"}
                              </p>
                            </div>
                            <div>
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Sex</span>
                              <p className="text-sm sm:text-base mt-1">
                                {child.sex || "Not provided"}
                              </p>
                            </div>
                            <div className="col-span-2">
                              <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">Ethnicity</span>
                              <p className="text-sm sm:text-base mt-1">
                                {child.ethnicities && child.ethnicities.length > 0
                                  ? child.ethnicities.join(", ")
                                  : "Not provided"}
                              </p>
                            </div>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="w-full">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="p-3 rounded-full bg-muted mb-3">
                      <Baby className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No child information available yet.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="mb-8">
            <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Test Kits
            </h2>
            {loadingKits ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {[1, 2].map((i) => (
                  <Card key={i} className="w-full">
                    <CardHeader className="pb-4">
                      <div className="flex items-center gap-2">
                        <Skeleton className="h-5 w-5 rounded" />
                        <Skeleton className="h-6 w-24" />
                      </div>
                      <Skeleton className="h-4 w-20 mt-1" />
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="flex justify-between">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="h-4 w-32" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : kits.length > 0 ? (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
                {kits.map((kit) => {
                  const kitIsUnborn = isUnbornChild(kit.child);
                  return (
                    <Card 
                      key={kit.id} 
                      className="w-full group"
                    >
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-primary/10 group-hover:bg-primary/20 transition-colors">
                              <Package className="w-5 h-5 text-primary" />
                            </div>
                            Kit #{kit.kitNumber}
                          </CardTitle>
                          <div className="flex items-center gap-2">
                            {kitIsUnborn && (
                              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-secondary text-secondary-foreground">
                                Pending
                              </span>
                            )}
                            <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
                              {getKitTypeDisplayName(kit.kitType)}
                            </span>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        {kit.child ? (
                          kitIsUnborn ? (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                              <Clock className="h-4 w-4 text-fore-teal" />
                              <div>
                                <span className="text-xs text-muted-foreground">Due Date</span>
                                <p className="text-sm font-semibold text-foreground">
                                  {kit.child.dueDate ? formatLocalDate(kit.child.dueDate) : "Not set"}
                                </p>
                              </div>
                            </div>
                          ) : (
                            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
                              <div className="p-2 rounded-full bg-background">
                                <Baby className="h-4 w-4 text-muted-foreground" />
                              </div>
                              <div>
                                <span className="text-xs text-muted-foreground">Assigned to</span>
                                <p className="text-sm font-medium">
                                  {kit.child.firstName || "Unknown"}{" "}
                                  {kit.child.lastName || "Name"}
                                </p>
                              </div>
                            </div>
                          )
                        ) : (
                          <div className="flex items-center gap-3 p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800">
                            <Clock className="h-4 w-4 text-amber-600" />
                            <span className="text-sm text-amber-700 dark:text-amber-300">
                              Child information pending
                            </span>
                          </div>
                        )}

                        {/* Report Download Section */}
                        {selectedOrder?.status === "COMPLETE_REPORT_DELIVERED" &&
                        getAvailableReports(kit).length > 0 ? (
                          <div className="pt-4 border-t space-y-2">
                            {getAvailableReports(kit).map((report) => {
                              const downloadKey = `${kit.id}-${report.label}`;
                              return (
                                <div
                                  key={report.label}
                                  className="flex items-center justify-between p-3 rounded-lg bg-white border border-slate-200"
                                >
                                  <div className="flex items-center gap-2">
                                    <CheckCircle className="w-5 h-5 text-green-600" />
                                    <span className="text-sm font-medium text-slate-800">
                                      {report.label}
                                    </span>
                                  </div>
                                  <Button
                                    size="sm"
                                    onClick={() =>
                                      handleDownloadReport(downloadKey, kit.id, report.fileName)
                                    }
                                    disabled={downloadingReports[downloadKey]}
                                    className="bg-green-600 hover:bg-green-700 text-white shadow-sm"
                                  >
                                    <Download className="w-4 h-4 mr-2" />
                                    {downloadingReports[downloadKey]
                                      ? "Downloading..."
                                      : "Download"}
                                  </Button>
                                </div>
                              );
                            })}
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            ) : (
              <Card className="w-full">
                <CardContent className="py-8">
                  <div className="flex flex-col items-center justify-center text-center">
                    <div className="p-3 rounded-full bg-muted mb-3">
                      <Package className="h-6 w-6 text-muted-foreground" />
                    </div>
                    <p className="text-sm text-muted-foreground">
                      No test kits found for this order.
                    </p>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>

          {/* Order Status Card - Show for selected order */}
          {selectedOrder && (
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
                <Clock className="h-5 w-5 text-primary" />
                Order Progress
              </h2>
              <OrderStatusCard order={selectedOrder} user={user} />
            </div>
          )}
        </>

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
