import { dateFormats } from "@/lib/utils";
import { Check } from "lucide-react";

const ORDER_STEPS = [
  {
    key: "ONBOARDING_COMPLETED",
    label: "Onboarding Completed",
    shortLabel: "Onboarding\nCompleted",
    description:
      "Your account setup is complete and your order is being prepared.",
  },
  {
    key: "PREPARING_ORDER",
    label: "Preparing Order",
    shortLabel: "Preparing\nOrder",
    description:
      "We're assembling your collection kit and preparing it for shipment.",
  },
  {
    key: "SHIPPED_TO_USER",
    label: "Shipped to You",
    shortLabel: "Shipped\nto You",
    description:
      "Your collection kit is on its way! Check your email for tracking details.",
  },
  {
    key: "DELIVERED_AWAITING_RETURN",
    label: "Delivered / Awaiting Return",
    shortLabel: "Delivered /\nAwaiting Return",
    description:
      "Your kit has been delivered. Complete the sample collection and ship it back using the prepaid label.",
  },
  {
    key: "SHIPPED_TO_LAB",
    label: "Shipped to Lab",
    shortLabel: "Shipped\nto Lab",
    description:
      "Your child's sample is in transit to our certified lab for advanced sequencing and review.",
  },
  {
    key: "RECEIVED_IN_PROCESS",
    label: "Received / In Process",
    shortLabel: "Received /\nIn Process",
    description:
      "The lab has received your sample and sequencing is underway. This typically takes a few weeks.",
  },
  {
    key: "COMPLETE",
    label: "Complete",
    shortLabel: "Complete",
    description: "Your results are ready! View your report in the dashboard.",
  },
];

export default function OrderStatusCard({
  order,
  user,
}: {
  order: any;
  user?: any;
}) {
  const currentStepIndex = ORDER_STEPS.findIndex(
    (s) => s.key === order.status
  );

  const displayStepIndex =
    order.status === "COMPLETE_REPORT_DELIVERED" ||
    order.status === "COMPLETE_NO_COUNSELING_REQUIRED"
      ? ORDER_STEPS.findIndex((s) => s.key === "COMPLETE")
      : currentStepIndex;

  const currentStatusLabel =
    order.status === "COMPLETE_REPORT_DELIVERED" ||
    order.status === "COMPLETE_NO_COUNSELING_REQUIRED"
      ? "Complete"
      : ORDER_STEPS[currentStepIndex]?.label ?? "Unknown";

  return (
    <div className="w-full bg-white rounded-2xl border border-slate-200 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pb-6 border-b border-slate-200">
        <h2 className="text-lg sm:text-xl font-semibold leading-none tracking-tight">
          Order Status
        </h2>
        <div className="flex flex-col sm:items-end gap-1 text-sm">
          <p className="text-slate-500">
            <span className="font-semibold text-slate-700">
              Current Status:
            </span>{" "}
            {currentStatusLabel}
          </p>
          <p className="text-slate-500">
            <span className="font-semibold text-slate-700">Last Updated:</span>{" "}
            {order.statusUpdatedAt
              ? dateFormats.shortWithTime(new Date(order.statusUpdatedAt))
              : "N/A"}
          </p>
        </div>
      </div>

      {/* Mobile: Vertical Timeline */}
      <div className="block lg:hidden pt-8">
        <div className="relative">
          {ORDER_STEPS.map((step, idx) => {
            const isCompleted = idx < displayStepIndex;
            const isCurrent = idx === displayStepIndex;
            const isFuture = idx > displayStepIndex;
            const isLast = idx === ORDER_STEPS.length - 1;

            return (
              <div
                key={step.key}
                className="relative flex items-start gap-4"
              >
                <div className="flex flex-col items-center">
                  <div
                    className={`relative z-10 flex items-center justify-center rounded-full shrink-0 transition-all duration-300 w-10 h-10 ${
                      isCompleted
                        ? "bg-fore-teal text-white"
                        : isCurrent
                          ? "bg-fore-teal text-white ring-4 ring-fore-teal/20"
                          : "bg-white border-2 border-slate-300"
                    }`}
                  >
                    {(isCompleted || isCurrent) && (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    )}
                  </div>
                  {!isLast && (
                    <div
                      className={`w-0.5 flex-1 min-h-[40px] ${
                        isCompleted ? "bg-fore-teal" : "bg-slate-200"
                      }`}
                    />
                  )}
                </div>

                <div className={`flex-1 ${isLast ? "pb-0" : "pb-6"}`}>
                  <p
                    className={`text-sm font-semibold leading-tight whitespace-pre-line ${
                      isFuture
                        ? "text-slate-400"
                        : isCurrent
                          ? "text-slate-800"
                          : "text-slate-600"
                    }`}
                  >
                    {step.shortLabel}
                  </p>
                  {isCurrent && (
                    <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">
                      {step.description}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Desktop: Horizontal Timeline */}
      <div className="hidden lg:block pt-10">
        <div className="relative">
          {/* Background track */}
          <div className="absolute top-5 left-5 right-5 h-0.5 bg-slate-200" />
          {/* Progress track */}
          <div
            className="absolute top-5 left-5 h-0.5 bg-fore-teal transition-all duration-500"
            style={{
              width: `calc(${(displayStepIndex / (ORDER_STEPS.length - 1)) * 100}% - ${displayStepIndex === ORDER_STEPS.length - 1 ? "40px" : "20px"})`,
            }}
          />

          <div className="relative grid grid-cols-7">
            {ORDER_STEPS.map((step, idx) => {
              const isCompleted = idx < displayStepIndex;
              const isCurrent = idx === displayStepIndex;
              const isFuture = idx > displayStepIndex;

              return (
                <div
                  key={step.key}
                  className="flex flex-col items-center text-center"
                >
                  <div
                    className={`relative z-10 flex items-center justify-center rounded-full shrink-0 transition-all duration-300 w-10 h-10 ${
                      isCompleted
                        ? "bg-fore-teal text-white"
                        : isCurrent
                          ? "bg-fore-teal text-white ring-4 ring-fore-teal/20"
                          : "bg-white border-2 border-slate-300"
                    }`}
                  >
                    {(isCompleted || isCurrent) && (
                      <Check className="h-5 w-5" strokeWidth={3} />
                    )}
                  </div>
                  <p
                    className={`mt-3 text-xs font-semibold leading-tight whitespace-pre-line ${
                      isFuture
                        ? "text-slate-400"
                        : isCurrent
                          ? "text-slate-800"
                          : "text-slate-600"
                    }`}
                  >
                    {step.shortLabel}
                  </p>
                </div>
              );
            })}
          </div>

          {/* Current step description below the track */}
          {displayStepIndex >= 0 && displayStepIndex < ORDER_STEPS.length && (
            <p className="mt-6 text-sm text-slate-500 text-center max-w-lg mx-auto leading-relaxed">
              {ORDER_STEPS[displayStepIndex].description}
            </p>
          )}
        </div>
      </div>

      {/* Genetic Counseling CTA */}
      {order.status === "COMPLETE_REPORT_DELIVERED" && (
        <div className="mt-8 p-4 bg-secondary rounded-xl border border-fore-teal/30">
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
                Your genetic test results are ready! Schedule a consultation
                with our genetic counselors to discuss your results and answer
                any questions you may have.
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
      )}

      {/* Tracking Numbers */}
      {order.outboundTrackingNumber && order.status === "SHIPPED_TO_USER" && (
        <div className="mt-6 p-4 bg-secondary rounded-xl border border-fore-teal/25">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-primary uppercase tracking-wide">
                Tracking Number
              </span>
              <p className="text-sm font-mono text-foreground mt-1">
                {order.outboundTrackingNumber}
              </p>
            </div>
            <a
              href={`https://www.google.com/search?q=${order.outboundTrackingNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-primary hover:text-primary/80 underline"
            >
              Track Package
            </a>
          </div>
        </div>
      )}

      {order.inboundTrackingNumber && order.status === "SHIPPED_TO_LAB" && (
        <div className="mt-6 p-4 bg-green-50 rounded-xl border border-green-200">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-xs font-medium text-green-600 uppercase tracking-wide">
                Return Tracking
              </span>
              <p className="text-sm font-mono text-green-800 mt-1">
                {order.inboundTrackingNumber}
              </p>
            </div>
            <a
              href={`https://www.google.com/search?q=${order.inboundTrackingNumber}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-medium text-green-600 hover:text-green-700 underline"
            >
              Track Package
            </a>
          </div>
        </div>
      )}
    </div>
  );
}
