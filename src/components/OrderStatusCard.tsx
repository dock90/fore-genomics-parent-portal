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
  { key: "COMPLETE_REPORT_DELIVERED", label: "Complete / Report Available" },
];

export default function OrderStatusCard({ order }: { order: any }) {
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
                  ${idx < currentStepIndex ? "bg-green-500" : idx === currentStepIndex ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span
                    className={`text-sm ${idx === currentStepIndex ? "font-bold text-blue-700" : "text-gray-500"}`}
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
          <div className="flex flex-row items-center justify-between">
            {ORDER_STEPS.map((step, idx) => (
              <div key={step.key} className="flex-1 flex flex-col items-center">
                <div
                  className={`rounded-full w-8 h-8 flex items-center justify-center text-white text-sm font-bold mb-2
                  ${idx < currentStepIndex ? "bg-green-500" : idx === currentStepIndex ? "bg-blue-600" : "bg-gray-300"}`}
                >
                  {idx + 1}
                </div>
                <span
                  className={`text-xs text-center ${idx === currentStepIndex ? "font-bold text-blue-700" : "text-gray-500"}`}
                >
                  {step.label}
                </span>
                {idx < ORDER_STEPS.length - 1 && (
                  <div
                    className={`h-1 w-full mt-2 ${idx < currentStepIndex ? "bg-green-400" : "bg-gray-200"}`}
                  ></div>
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
            {ORDER_STEPS[currentStepIndex]?.label}
          </span>
          <span className="text-xs text-muted-foreground">
            Last updated:{" "}
            {order.statusUpdatedAt
              ? format(new Date(order.statusUpdatedAt), "MMM dd, yyyy, h:mm a")
              : "N/A"}
          </span>

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
