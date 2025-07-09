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
        <div className="flex flex-col items-center text-center space-y-2 sm:space-y-3 pt-4 border-t">
          <span className="text-sm font-medium text-muted-foreground">Current Status:</span>
          <span className="text-lg sm:text-xl font-bold text-blue-700">
            {ORDER_STEPS[currentStepIndex]?.label}
          </span>
          <span className="text-xs sm:text-sm text-muted-foreground">
            Last updated: {order.statusUpdatedAt ? format(new Date(order.statusUpdatedAt), 'MMM dd, yyyy, h:mm a') : 'N/A'}
          </span>
        </div>
      </CardContent>
    </Card>
  );
} 