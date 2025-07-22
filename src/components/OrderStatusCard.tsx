import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const ORDER_STEPS = [
  { key: 'ONBOARDING_COMPLETED', label: 'Onboarding Completed' },
  { key: 'PREPARING_ORDER', label: 'Preparing Order' },
  { key: 'SHIPPED_TO_USER', label: 'Shipped to You' },
  { key: 'DELIVERED_AWAITING_RETURN', label: 'Delivered / Awaiting Return' },
  { key: 'SHIPPED_TO_LAB', label: 'Shipped to Lab' },
  { key: 'RECEIVED_IN_PROCESS', label: 'Received / In Process' },
  { key: 'COMPLETE_REPORT_DELIVERED', label: 'Complete / Report Delivered' },
];

export default function OrderStatusCard({ order }: { order: any }) {
  const currentStepIndex = ORDER_STEPS.findIndex(s => s.key === order.status);

  return (
    <Card className="w-full">
      <CardHeader className="pb-3 sm:pb-4">
        <CardTitle className="text-lg sm:text-xl flex flex-col sm:flex-row sm:items-center gap-2">
          Order Status
          <Badge variant="secondary" className="w-fit text-xs sm:text-sm">
            {order.orderNumber}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 sm:space-y-6">
        {/* Mobile Progress View */}
        <div className="block sm:hidden">
          <div className="space-y-3">
            {ORDER_STEPS.map((step, idx) => (
              <div key={step.key} className="flex items-center gap-3">
                <div className={`rounded-full w-8 h-8 flex items-center justify-center text-white text-sm font-bold flex-shrink-0
                  ${idx < currentStepIndex ? 'bg-green-500' : idx === currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <span className={`text-sm ${idx === currentStepIndex ? 'font-bold text-blue-700' : 'text-gray-500'}`}>
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
                <div className={`rounded-full w-8 h-8 flex items-center justify-center text-white text-sm font-bold mb-2
                  ${idx < currentStepIndex ? 'bg-green-500' : idx === currentStepIndex ? 'bg-blue-600' : 'bg-gray-300'}`}>
                  {idx + 1}
                </div>
                <span className={`text-xs text-center ${idx === currentStepIndex ? 'font-bold text-blue-700' : 'text-gray-500'}`}>
                  {step.label}
                </span>
                {idx < ORDER_STEPS.length - 1 && (
                  <div className={`h-1 w-full mt-2 ${idx < currentStepIndex ? 'bg-green-400' : 'bg-gray-200'}`}></div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Status Summary */}
        <div className="flex flex-col space-y-3 pt-4 border-t">
          <span className="text-sm font-medium text-muted-foreground">Current Status:</span>
          <span className="text-lg font-bold text-blue-700">
            {ORDER_STEPS[currentStepIndex]?.label}
          </span>
          <span className="text-xs text-muted-foreground">
            Last updated: {order.statusUpdatedAt ? format(new Date(order.statusUpdatedAt), 'MMM dd, yyyy, h:mm a') : 'N/A'}
          </span>
          
          {/* Tracking Numbers - Show based on order status */}
          {order.outboundTrackingNumber && order.status === 'SHIPPED_TO_USER' && (
            <div className="mt-4">
              <div className="p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg border border-blue-200 dark:border-blue-800">
                <span className="text-sm font-medium text-blue-700 dark:text-blue-300">Tracking Number:</span>
                <div className="mt-1">
                  <span className="text-sm font-mono text-blue-800 dark:text-blue-200 break-all">
                    {order.outboundTrackingNumber}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Show inbound tracking number when shipped to lab */}
          {order.inboundTrackingNumber && order.status === 'SHIPPED_TO_LAB' && (
            <div className="mt-4">
              <div className="p-3 bg-green-50 dark:bg-green-950/20 rounded-lg border border-green-200 dark:border-green-800">
                <span className="text-sm font-medium text-green-700 dark:text-green-300">Tracking Number:</span>
                <div className="mt-1">
                  <span className="text-sm font-mono text-green-800 dark:text-green-200 break-all">
                    {order.inboundTrackingNumber}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Instructions for DELIVERED_AWAITING_RETURN status */}
          {order.status === 'DELIVERED_AWAITING_RETURN' && (
            <div className="mt-4">
              <div className="p-4 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/30 dark:to-orange-950/20 rounded-lg border border-amber-200/50 dark:border-amber-800/50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-amber-100 dark:bg-amber-900/50 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-amber-600 dark:text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-amber-900 dark:text-amber-100 mb-2">
                      Next Steps: Sample Collection & Return
                    </h4>
                    <div className="text-sm text-amber-800 dark:text-amber-200 space-y-3">
                      <p>Please follow the instructions provided with your kit to:</p>
                      <div className="bg-white/50 dark:bg-amber-950/30 rounded-lg p-3 border border-amber-200/50 dark:border-amber-800/30">
                        <ol className="space-y-2">
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">1</span>
                            <span className="text-sm">Collect the required sample from your child</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">2</span>
                            <span className="text-sm">Package the sample according to the kit instructions</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">3</span>
                            <span className="text-sm">Use the return shipping label provided in your kit</span>
                          </li>
                          <li className="flex items-start gap-2">
                            <span className="flex-shrink-0 w-5 h-5 bg-amber-500 text-white text-xs font-bold rounded-full flex items-center justify-center mt-0.5">4</span>
                            <span className="text-sm">Drop off the package at your nearest shipping location</span>
                          </li>
                        </ol>
                      </div>
                      <div className="p-3 bg-amber-100/50 dark:bg-amber-900/30 rounded-lg border-l-4 border-amber-500">
                        <p className="text-sm font-medium text-amber-900 dark:text-amber-100">
                          Once you've returned the sample, we'll update your order status and begin processing.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {/* Information for RECEIVED_IN_PROCESS status */}
          {order.status === 'RECEIVED_IN_PROCESS' && (
            <div className="mt-4">
              <div className="p-4 bg-gradient-to-br from-blue-50 to-indigo-50 dark:from-blue-950/30 dark:to-indigo-950/20 rounded-lg border border-blue-200/50 dark:border-blue-800/50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-blue-100 dark:bg-blue-900/50 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-blue-600 dark:text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2">
                      Sample Received & Processing
                    </h4>
                    <div className="text-sm text-blue-800 dark:text-blue-200 space-y-3">
                      <p>Great news! We've received your sample and our lab team is now processing it.</p>
                      <div className="p-3 bg-blue-100/50 dark:bg-blue-900/30 rounded-lg border-l-4 border-blue-500">
                        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
                          Your comprehensive genetic report will be made available on this portal as soon as possible. We'll notify you when it's ready.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Report Download for COMPLETE_REPORT_DELIVERED status */}
          {order.status === 'COMPLETE_REPORT_DELIVERED' && order.reportFileName && (
            <div className="mt-4">
              <div className="p-4 bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950/30 dark:to-emerald-950/20 rounded-lg border border-green-200/50 dark:border-green-800/50">
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0">
                    <div className="w-8 h-8 bg-green-100 dark:bg-green-900/50 rounded-full flex items-center justify-center">
                      <svg className="w-4 h-4 text-green-600 dark:text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-semibold text-green-900 dark:text-green-100 mb-2">
                      Your Genetic Report is Ready!
                    </h4>
                    <div className="text-sm text-green-800 dark:text-green-200 space-y-3">
                      <p>Your comprehensive genetic testing report has been completed and is now available for download.</p>
                      <div className="p-3 bg-green-100/50 dark:bg-green-900/30 rounded-lg border-l-4 border-green-500">
                        <p className="text-sm font-medium text-green-900 dark:text-green-100 mb-2">
                          Report: {order.reportFileName.split('/').pop()}
                        </p>
                        <button 
                          onClick={async () => {
                            try {
                              const response = await fetch('/api/reports/download', {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ fileName: order.reportFileName })
                              });
                              
                              if (response.ok) {
                                const { downloadUrl } = await response.json();
                                window.open(downloadUrl, '_blank');
                              } else {
                                alert('Failed to generate download link');
                              }
                            } catch (error) {
                              console.error('Download error:', error);
                              alert('Failed to download report');
                            }
                          }}
                          className="text-sm bg-green-600 text-white px-3 py-1 rounded hover:bg-green-700 transition-colors"
                        >
                          Download Report
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
} 