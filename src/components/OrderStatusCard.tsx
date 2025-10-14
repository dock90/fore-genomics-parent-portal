import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { useState, useEffect } from "react";

interface Kit {
  id: string;
  kitNumber: number;
  kitType: string;
  status: string;
  childId: string | null;
  consentId: string | null;
  questionnaireId: string | null;
  child?: {
    id: string;
    firstName: string;
    lastName: string;
    dob: string;
  } | null;
}

const ORDER_STEPS = [
  { key: "ONBOARDING_COMPLETED", label: "Onboarding Completed" },
  { key: "PREPARING_ORDER", label: "Preparing Order" },
  { key: "SHIPPED_TO_USER", label: "Shipped to You" },
  { key: "DELIVERED_AWAITING_RETURN", label: "Delivered / Awaiting Return" },
  { key: "SHIPPED_TO_LAB", label: "Shipped to Lab" },
  { key: "RECEIVED_IN_PROCESS", label: "Received / In Process" },
  { key: "COMPLETE", label: "Complete" },
];

export default function OrderStatusCard({ order, user }: { order: any, user?: any }) {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loadingKits, setLoadingKits] = useState(false);

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
        console.error("Error fetching kits:", error);
      } finally {
        setLoadingKits(false);
      }
    };

    fetchKits();
  }, [order?.id]);

  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.key === order.status);
  
  // Handle both completion states - they should both show the final step
  const displayStepIndex = (order.status === "COMPLETE_REPORT_DELIVERED" || order.status === "COMPLETE_COUNSELING_REQUIRED") 
    ? ORDER_STEPS.findIndex((s) => s.key === "COMPLETE")
    : currentStepIndex;

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl flex flex-col sm:flex-row sm:items-center gap-2">
          Order Status
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Mobile Progress View */}
        <div className="block sm:hidden">
          <div className="space-y-3">
            {ORDER_STEPS.map((step, idx) => (
              <div key={step.key} className="flex items-center gap-3">
                <div
                  className={`rounded-full w-8 h-8 flex items-center justify-center text-white text-sm font-bold flex-shrink-0
                  ${idx < displayStepIndex ? "bg-green-500" : idx === displayStepIndex ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${idx === displayStepIndex ? "font-bold text-blue-700" : "text-gray-500"}`}
                  >
                    {step.label}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desktop Progress View */}
        <div className="hidden sm:block">
          <div className="grid grid-cols-7 gap-0 relative">
            {ORDER_STEPS.map((step, idx) => (
              <div key={step.key} className="flex flex-col items-center relative">
                <div
                  className={`rounded-full w-8 h-8 flex items-center justify-center text-white text-sm font-bold mb-2 relative z-10
                  ${idx < displayStepIndex ? "bg-green-500" : idx === displayStepIndex ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-xs text-center ${idx === displayStepIndex ? "font-bold text-blue-700" : "text-gray-500"}`}
                >
                  {step.label}
                </span>
                
                {/* Connecting line to next step */}
                {idx < ORDER_STEPS.length - 1 && (
                  <div className="absolute top-4 left-1/2 w-full h-1">
                    <div 
                      className={`h-full ${idx < displayStepIndex ? "bg-green-400" : "bg-gray-200"}`}
                      style={{ width: '100%' }}
                    ></div>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status Summary */}
        <div className="flex flex-col space-y-3 pt-4 border-t">
          <span className="text-sm font-medium text-muted-foreground">
            Current Status:
          </span>
          <span className="text-lg font-bold text-blue-700">
            {(order.status === "COMPLETE_REPORT_DELIVERED" || order.status === "COMPLETE_COUNSELING_REQUIRED") 
              ? "Complete" 
              : ORDER_STEPS[currentStepIndex]?.label
            }
          </span>
          <span className="text-xs text-muted-foreground">
            Last updated:{" "}
            {order.statusUpdatedAt
              ? format(new Date(order.statusUpdatedAt), "MMM dd, yyyy, h:mm a")
              : "N/A"}
          </span>

          {/* Genetic Counseling Link - Show when report is delivered */}
          {(order.status === "COMPLETE_REPORT_DELIVERED" || order.status === "COMPLETE_COUNSELING_REQUIRED") && (
            <div className="mt-4">
              <div className="p-4 bg-purple-50 dark:bg-purple-950/20 rounded-lg border border-purple-200 dark:border-purple-800">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-purple-600 dark:text-purple-400"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                      />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold text-purple-800 dark:text-purple-200 mb-1">
                      Schedule Genetic Counseling
                    </h4>
                    <p className="text-sm text-purple-700 dark:text-purple-300 mb-3">
                      Your genetic test results are ready! Schedule a consultation with our genetic counselors to discuss your results and answer any questions you may have.
                    </p>
                    <a
                      href={
                        process.env.NODE_ENV === "production"
                          ? `https://greygenetics.as.me/ForeGenomics-1stappt-results-${encodeURIComponent(
                              user.profile.state ?? "Other"
                            )}`
                          : "https://calendly.com/adam-foregenomics/post-test-genetic-counseling"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium rounded-md transition-colors"
                    >
                      <svg
                        className="w-4 h-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      Schedule Appointment
                    </a>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tracking Numbers - Show based on order status */}
          {order.outboundTrackingNumber &&
            order.status === "SHIPPED_TO_USER" && (
              <div className="mt-4">
                <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                  <span className="text-sm font-medium text-blue-700 dark:text-blue-300">
                    Tracking Number:
                  </span>
                  <div className="mt-1">
                    <span className="text-sm font-mono text-blue-800 dark:text-blue-200 break-all">
                      {order.outboundTrackingNumber}
                    </span>
                  </div>
                </div>
              </div>
            )}

          {/* Show inbound tracking number when shipped to lab */}
          {order.inboundTrackingNumber && order.status === "SHIPPED_TO_LAB" && (
            <div className="mt-4">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">
                  Tracking Number:
                </span>
                <div className="mt-1">
                  <span className="text-sm font-mono text-green-800 dark:text-green-200 break-all">
                    {order.inboundTrackingNumber}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
