import { Button } from "@/components/ui/button";
import * as React from "react";

export default function ConfirmationStep({ onDashboard }: any) {
  return (
    <div className="max-w-lg mx-auto text-center space-y-6">
      <h2 className="text-2xl font-bold text-green-700">Onboarding Complete!</h2>
      <p className="text-lg">Thank you for completing the onboarding process. You can now access your dashboard.</p>
      <Button className="w-full" onClick={onDashboard}>Go to Dashboard</Button>
    </div>
  );
} 