import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { dateFormats } from "@/lib/utils";
import { Check } from "lucide-react";

const ORDER_STEPS = [
  { key: "ONBOARDING_COMPLETED", label: "Onboarding", shortLabel: "Onboarded" },
  { key: "PREPARING_ORDER", label: "Preparing", shortLabel: "Preparing" },
  { key: "SHIPPED_TO_USER", label: "Shipped", shortLabel: "Shipped" },
  { key: "DELIVERED_AWAITING_RETURN", label: "Delivered", shortLabel: "Delivered" },
  { key: "SHIPPED_TO_LAB", label: "To Lab", shortLabel: "To Lab" },
  { key: "RECEIVED_IN_PROCESS", label: "Processing", shortLabel: "Processing" },
  { key: "COMPLETE", label: "Complete", shortLabel: "Complete" },
];

export default function OrderStatusCard({
  order,
  user,
}: {
  order: any;
  user?: any;
}) {
  const currentStepIndex = ORDER_STEPS.findIndex((s) => s.key === order.status);

  // Handle both completion states - they should both show the final step
  const displayStepIndex =
    order.status === "COMPLETE_REPORT_DELIVERED" ||
    order.status === "COMPLETE_COUNSELING_REQUIRED" ||
    order.status === "COMPLETE_NO_COUNSELING_REQUIRED"
      ? ORDER_STEPS.findIndex((s) => s.key === "COMPLETE")
      : currentStepIndex;

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="pb-4 bg-gradient-to-r from-primary/5 to-transparent">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg sm:text-xl">
            Order Status
          </CardTitle>
          <span className="text-xs font-medium px-3 py-1.5 rounded-full bg-primary/10 text-primary">
            {order.orderNumber}
          </span>
        </div>
      </CardHeader>
      <CardContent className="space-y-6 pt-6">
        {/* Mobile Progress View */}
        <div className="block sm:hidden">
          <div className="space-y-0">
            {ORDER_STEPS.map((step, idx) => (
              <div key={step.key} className="flex items-start gap-3 relative">
                {/* Vertical line connector */}
                {idx < ORDER_STEPS.length - 1 && (
                  <div
                    className={`absolute left-[15px] top-8 w-0.5 h-[calc(100%-8px)] ${
                      idx < displayStepIndex ? "bg-fore-teal" : "bg-muted"
                    }`}
                  />
                )}
                <div
                  className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold flex-shrink-0 transition-all duration-300 ${
                    idx < displayStepIndex
                      ? "bg-fore-teal text-white"
                      : idx === displayStepIndex
                        ? "bg-fore-blue text-white ring-4 ring-fore-blue/20"
                        : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx < displayStepIndex ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    idx + 1
                  )}
                </div>
                <div className="flex-1 min-w-0 pb-6">
                  <span
                    className={`text-sm ${
                      idx === displayStepIndex
                        ? "font-semibold text-foreground"
                        : idx < displayStepIndex
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60"
                    }`}
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
          <div className="relative">
            {/* Background track */}
            <div className="absolute top-4 left-0 right-0 h-1 bg-muted rounded-full" />
            {/* Progress track */}
            <div
              className="absolute top-4 left-0 h-1 bg-fore-teal rounded-full transition-all duration-500"
              style={{ width: `${(displayStepIndex / (ORDER_STEPS.length - 1)) * 100}%` }}
            />

            <div className="grid grid-cols-7 gap-0 relative">
              {ORDER_STEPS.map((step, idx) => (
                <div
                  key={step.key}
                  className="flex flex-col items-center relative"
                >
                  <div
                    className={`rounded-full w-8 h-8 flex items-center justify-center text-sm font-bold mb-2 relative z-10 transition-all duration-300 ${
                      idx < displayStepIndex
                        ? "bg-fore-teal text-white"
                        : idx === displayStepIndex
                          ? "bg-fore-blue text-white ring-4 ring-fore-blue/20"
                          : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {idx < displayStepIndex ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      idx + 1
                    )}
                  </div>
                  <span
                    className={`text-xs text-center leading-tight ${
                      idx === displayStepIndex
                        ? "font-semibold text-foreground"
                        : idx < displayStepIndex
                          ? "text-muted-foreground"
                          : "text-muted-foreground/60"
                    }`}
                  >
                    {step.shortLabel}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Status Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pt-6 border-t">
          <div className="space-y-1">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Current Status
            </span>
            <p className="text-lg font-semibold text-primary">
              {order.status === "COMPLETE_REPORT_DELIVERED" ||
              order.status === "COMPLETE_COUNSELING_REQUIRED" ||
              order.status === "COMPLETE_NO_COUNSELING_REQUIRED"
                ? "Complete"
                : ORDER_STEPS[currentStepIndex]?.label}
            </p>
          </div>
          <div className="text-left sm:text-right">
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
              Last Updated
            </span>
            <p className="text-sm">
              {order.statusUpdatedAt
                ? dateFormats.shortWithTime(new Date(order.statusUpdatedAt))
                : "N/A"}
            </p>
          </div>
        </div>

        <div className="space-y-4">

          {/* Genetic Counseling Link - Show when report is delivered */}
          {(order.status === "COMPLETE_REPORT_DELIVERED" ||
            order.status === "COMPLETE_COUNSELING_REQUIRED") && (
            <div className="mt-4">
              <div className="p-4 bg-secondary rounded-xl border border-fore-teal/30">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <svg
                      className="w-5 h-5 text-fore-teal"
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
                    <h4 className="text-sm font-semibold text-fore-teal mb-1">
                      Schedule Genetic Counseling
                    </h4>
                    <p className="text-sm text-muted-foreground mb-3">
                      Your genetic test results are ready! Schedule a
                      consultation with our genetic counselors to discuss your
                      results and answer any questions you may have.
                    </p>
                    <a
                      href={
                        process.env.NODE_ENV === "production"
                          ? `https://greygenetics.as.me/ForeGenomics-1stappt-results-${encodeURIComponent(
                              user?.profile?.state ?? "Other"
                            )}`
                          : "https://calendly.com/adam-foregenomics/post-test-genetic-counseling"
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4 py-2 bg-fore-blue hover:bg-fore-blue/90 text-white text-sm font-medium rounded-lg transition-colors shadow-sm"
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
              <div className="p-4 bg-blue-50 dark:bg-blue-950/20 rounded-xl border border-blue-200 dark:border-blue-800">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs font-medium text-blue-600 dark:text-blue-400 uppercase tracking-wide">
                      Tracking Number
                    </span>
                    <p className="text-sm font-mono text-blue-800 dark:text-blue-200 mt-1">
                      {order.outboundTrackingNumber}
                    </p>
                  </div>
                  <a
                    href={`https://www.google.com/search?q=${order.outboundTrackingNumber}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-blue-600 hover:text-blue-700 dark:text-blue-400 underline"
                  >
                    Track Package
                  </a>
                </div>
              </div>
            )}

          {/* Show inbound tracking number when shipped to lab */}
          {order.inboundTrackingNumber && order.status === "SHIPPED_TO_LAB" && (
            <div className="p-4 bg-green-50 dark:bg-green-950/20 rounded-xl border border-green-200 dark:border-green-800">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-medium text-green-600 dark:text-green-400 uppercase tracking-wide">
                    Return Tracking
                  </span>
                  <p className="text-sm font-mono text-green-800 dark:text-green-200 mt-1">
                    {order.inboundTrackingNumber}
                  </p>
                </div>
                <a
                  href={`https://www.google.com/search?q=${order.inboundTrackingNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs font-medium text-green-600 hover:text-green-700 dark:text-green-400 underline"
                >
                  Track Package
                </a>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
