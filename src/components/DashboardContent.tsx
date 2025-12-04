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
} from "lucide-react";
import OrderStatusCard from "@/components/OrderStatusCard";
import CalendlyModal from "@/components/CalendlyModal";
import UnbornChildDashboard from "@/components/UnbornChildDashboard";
import { formatLocalDate } from "@/lib/utils";
import { useClerk } from "@clerk/nextjs";
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
  const { signOut } = useClerk();

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
    [kitId: string]: boolean;
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
    kitId: string,
    reportFileName: string
  ) => {
    setDownloadingReports((prev) => ({ ...prev, [kitId]: true }));

    try {
      const response = await fetch("/api/reports/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ fileName: reportFileName }),
      });

      if (response.ok) {
        const { downloadUrl } = await response.json();

        // Create a temporary link to download the file
        const a = document.createElement("a");
        a.href = downloadUrl;
        a.download = reportFileName || "report.pdf"; // Use filename directly since it's no longer a path
        a.target = "_blank";
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }
    } catch (error) {
    } finally {
      setDownloadingReports((prev) => ({ ...prev, [kitId]: false }));
    }
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

  // Check if the selected order is an unborn child order
  const isUnbornChildOrder = kits.some(
    (kit) =>
      // Either the kit has no child associated with it (unborn child not yet created)
      !kit.child ||
      // Or the kit has a child with only a due date (unborn child created during onboarding)
      (kit.child &&
        kit.child.dueDate &&
        !kit.child.firstName &&
        !kit.child.lastName)
  );

  return (
    <>
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
          <UnbornChildDashboard
            user={user}
            unbornChild={user.children.find(
              (child: any) =>
                child.dueDate && !child.firstName && !child.lastName
            )}
          />
        </div>
      )}

      {/* Regular Dashboard Content - Only show for non-unborn child orders */}
      {!isUnbornChildOrder && (
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
                  <span className="font-medium text-sm sm:text-base">
                    Name:
                  </span>
                  <span className="text-sm sm:text-base text-muted-foreground">
                    {profile?.firstName} {profile?.lastName}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">
                    Email:
                  </span>
                  <span className="text-sm sm:text-base text-muted-foreground break-all">
                    {user.email}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">
                    Phone:
                  </span>
                  <span className="text-sm sm:text-base text-muted-foreground">
                    {formatPhoneForDisplay(profile?.phone)}
                  </span>
                </div>
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">
                    Address:
                  </span>
                  <span className="text-sm sm:text-base text-muted-foreground">
                    {profile?.address ? (
                      <>
                        {profile.address}
                        {profile.addressLine2 && (
                          <>
                            <br />
                            {profile.addressLine2}
                          </>
                        )}
                        <br />
                        {profile.city}, {profile.state} {profile.zipCode}
                      </>
                    ) : (
                      "Not provided"
                    )}
                  </span>
                </div>
                {isFeatureEnabled("CALENDLY_INTEGRATION") &&
                  selectedOrder?.preTestCounselingEventId && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="font-medium text-sm sm:text-base">
                        Pre-Test Counseling:
                      </span>
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {selectedOrder.preTestCounselingDate
                          ? formatLocalDate(
                              selectedOrder.preTestCounselingDate,
                              "MMM dd, yyyy, h:mm a"
                            )
                          : "Scheduled"}
                      </span>
                    </div>
                  )}
                {isFeatureEnabled("CALENDLY_INTEGRATION") &&
                  selectedOrder?.postTestCounselingEventId && (
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="font-medium text-sm sm:text-base">
                        Post-Test Counseling:
                      </span>
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {selectedOrder.postTestCounselingDate
                          ? formatLocalDate(
                              selectedOrder.postTestCounselingDate,
                              "MMM dd, yyyy, h:mm a"
                            )
                          : "Scheduled"}
                      </span>
                    </div>
                  )}
              </CardContent>
            </Card>

            {/* Child Information */}
            {orderChildren.length > 0 ? (
              orderChildren.map((child, idx) => (
                <Card className="w-full" key={child.id || idx}>
                  <CardHeader className="pb-3 sm:pb-4">
                    <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                      Child Information{" "}
                      {orderChildren.length > 1 ? `#${idx + 1}` : null}
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 sm:space-y-4">
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="font-medium text-sm sm:text-base">
                        Name:
                      </span>
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {child.firstName || "Not provided"}{" "}
                        {child.lastName || ""}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="font-medium text-sm sm:text-base">
                        Date of Birth:
                      </span>
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {child.dob
                          ? formatLocalDate(child.dob, "MMM dd, yyyy")
                          : "Not provided"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="font-medium text-sm sm:text-base">
                        Sex:
                      </span>
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {child.sex || "Not provided"}
                      </span>
                    </div>
                    <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                      <span className="font-medium text-sm sm:text-base">
                        Ethnicity:
                      </span>
                      <span className="text-sm sm:text-base text-muted-foreground">
                        {child.ethnicities && child.ethnicities.length > 0
                          ? child.ethnicities.join(", ")
                          : "Not provided"}
                      </span>
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <Card className="w-full">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                    Child Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <span className="text-sm sm:text-base text-muted-foreground">
                    No child information available.
                  </span>
                </CardContent>
              </Card>
            )}
          </div>

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
                      <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                        <span className="font-medium text-sm sm:text-base">
                          Child Name:
                        </span>
                        <span className="text-sm sm:text-base text-muted-foreground">
                          {kit.child.firstName || "Unknown"}{" "}
                          {kit.child.lastName || "Name"}
                        </span>
                      </div>
                    ) : (
                      <div className="text-sm text-muted-foreground">
                        Child information pending
                      </div>
                    )}

                    {/* Report Download Section */}
                    {kit.reportFileName &&
                    selectedOrder?.status === "COMPLETE_REPORT_DELIVERED" ? (
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
                            onClick={() =>
                              handleDownloadReport(kit.id, kit.reportFileName!)
                            }
                            disabled={downloadingReports[kit.id]}
                            className="bg-green-600 hover:bg-green-700 text-white"
                          >
                            <Download className="w-4 h-4 mr-2" />
                            {downloadingReports[kit.id]
                              ? "Downloading..."
                              : "Download Report"}
                          </Button>
                        </div>
                      </div>
                    ) : null}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          {/* Order Status Card - Show for selected order */}
          {selectedOrder && (
            <div className="mb-6 sm:mb-8">
              <h2 className="text-xl font-semibold mb-4">
                {selectedOrder.orderNumber}
              </h2>

              <OrderStatusCard order={selectedOrder} user={user} />
            </div>
          )}
        </>
      )}

      {/* Calendly Modal */}
      <CalendlyModal
        isOpen={calendlyModalOpen}
        onClose={handleCalendlyClose}
        type={calendlyType}
        userEmail={user.email}
        userName={`${profile?.firstName} ${profile?.lastName}`}
      />
    </>
  );
}
