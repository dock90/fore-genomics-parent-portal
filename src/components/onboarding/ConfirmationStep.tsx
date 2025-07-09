import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import * as React from "react";

export default function ConfirmationStep({ onDashboard }: any) {
  return (
    <div className="text-center space-y-6 sm:space-y-8">
      <div className="space-y-4 sm:space-y-6">
        {/* Success Icon */}
        <div className="flex justify-center">
          <div className="w-16 h-16 sm:w-20 sm:h-20 bg-green-100 rounded-full flex items-center justify-center">
            <CheckCircle className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
          </div>
        </div>

        {/* Success Message */}
        <div className="space-y-3 sm:space-y-4">
          <h2 className="text-xl sm:text-2xl lg:text-3xl font-bold text-green-700">
            Onboarding Complete!
          </h2>
          <p className="text-sm sm:text-base lg:text-lg text-muted-foreground max-w-md mx-auto">
            Thank you for completing the onboarding process. Your profile has been successfully created and you can now access your dashboard.
          </p>
        </div>

        {/* Next Steps */}
        <div className="bg-muted/50 rounded-lg p-4 sm:p-6 max-w-md mx-auto">
          <h3 className="font-medium text-sm sm:text-base text-foreground mb-2">
            What's Next?
          </h3>
          <ul className="text-xs sm:text-sm text-muted-foreground space-y-1 text-left">
            <li>• Review your profile information</li>
            <li>• Check your order status</li>
            <li>• Schedule a pre-test genetic counseling appointment</li>
          </ul>
        </div>
      </div>

      {/* Action Button */}
      <Button 
        className="w-full sm:w-auto text-sm sm:text-base py-3 sm:py-4 px-8" 
        onClick={onDashboard}
      >
        Go to Dashboard
      </Button>
    </div>
  );
} 