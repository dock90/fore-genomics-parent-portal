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
import { Badge } from "@/components/ui/badge";
import { KitType } from "@/lib/kit-service";
import { Loader2, CheckCircle, Circle } from "lucide-react";

interface Kit {
  id: string;
  kitNumber: number;
  kitType: KitType;
  status: string;
  childId: string | null;
  consentId: string | null;
  questionnaireId: string | null;
  child?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    dob: string | null;
  } | null;
  order: {
    id: string;
    status: string;
  };
}

interface KitSelectionStepProps {
  orderId: string;
  onKitSelected: (kitId: string) => void;
  onBack: () => void;
  refreshTrigger?: number; // Add this to force refresh
}

export function KitSelectionStep({
  orderId,
  onKitSelected,
  onBack,
  refreshTrigger,
}: KitSelectionStepProps) {
  const [kits, setKits] = useState<Kit[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchKits();
  }, [orderId, refreshTrigger]); // Add refreshTrigger to dependencies

  const fetchKits = async () => {
    try {
      setLoading(true);
      const response = await fetch(`/api/orders/${orderId}/kits`);
      if (!response.ok) {
        throw new Error("Failed to fetch kits");
      }
      const kitsData = await response.json();
      setKits(kitsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load kits");
    } finally {
      setLoading(false);
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "ORDER_RECEIVED":
        return <Circle className="h-4 w-4 text-gray-400" />;
      case "ONBOARDING_COMPLETED":
      case "PREPARING_ORDER":
      case "SHIPPED_TO_USER":
      case "DELIVERED_AWAITING_RETURN":
      case "SHIPPED_TO_LAB":
      case "RECEIVED_IN_PROCESS":
      case "COMPLETE_REPORT_DELIVERED":
      case "COMPLETE_COUNSELING_REQUIRED":
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      default:
        return <Circle className="h-4 w-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case "ORDER_RECEIVED":
        return "Pending Onboarding";
      case "ONBOARDING_COMPLETED":
        return "Onboarding Complete";
      case "PREPARING_ORDER":
        return "Preparing Kit";
      case "SHIPPED_TO_USER":
        return "Shipped to You";
      case "DELIVERED_AWAITING_RETURN":
        return "Delivered / Awaiting Return";
      case "SHIPPED_TO_LAB":
        return "Shipped to Lab";
      case "RECEIVED_IN_PROCESS":
        return "Received / In Process";
      case "COMPLETE_REPORT_DELIVERED":
      case "COMPLETE_COUNSELING_REQUIRED":
        return "Complete";
      default:
        return "Unknown Status";
    }
  };

  const getKitTypeColor = (kitType: KitType) => {
    switch (kitType) {
      case "BASE":
        return "bg-blue-100 text-blue-800 border-blue-200";
      case "PLUS":
        return "bg-purple-100 text-purple-800 border-purple-200";
      case "PREMIUM":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
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
        return "Unknown Kit";
    }
  };

  const isKitComplete = (kit: Kit) => {
    return kit.childId && kit.consentId && kit.questionnaireId;
  };

  const canSelectKit = (kit: Kit) => {
    return kit.order.status === "ORDER_RECEIVED" && !isKitComplete(kit);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="flex items-center gap-2">
          <Loader2 className="h-6 w-6 animate-spin" />
          <span>Loading kits...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={fetchKits} variant="outline">
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const pendingKits = kits.filter((kit) => canSelectKit(kit));
  const completedKits = kits.filter((kit) => isKitComplete(kit));

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Select a Test Kit</h2>
        <p className="text-gray-600">
          This order contains {kits.length} test kit
          {kits.length !== 1 ? "s" : ""}.
          {completedKits.length > 0 && (
            <span className="block mt-2 text-green-600">
              ✓ You've completed {completedKits.length} kit
              {completedKits.length !== 1 ? "s" : ""}.
              {pendingKits.length > 0 && ` ${pendingKits.length} remaining.`}
            </span>
          )}
          {pendingKits.length > 0 && (
            <span className="block mt-1">
              Please select which kit you'd like to complete onboarding for.
            </span>
          )}
        </p>
      </div>

      {/* Pending Kits */}
      {pendingKits.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Available Kits</h3>
          <div className="grid gap-4">
            {pendingKits.map((kit) => (
              <Card
                key={kit.id}
                className="cursor-pointer hover:shadow-md transition-shadow"
                onClick={() => onKitSelected(kit.id)}
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(kit.status)}
                        <CardTitle className="text-lg">
                          Kit #{kit.kitNumber}
                        </CardTitle>
                      </div>
                      <Badge className={getKitTypeColor(kit.kitType)}>
                        {getKitTypeDisplayName(kit.kitType)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    Click to start onboarding for this kit. You'll need to
                    provide child information, complete consent forms, and
                    answer a questionnaire.
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Completed Kits */}
      {completedKits.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold">Completed Kits</h3>
          <div className="grid gap-4">
            {completedKits.map((kit) => (
              <Card key={kit.id} className="opacity-75">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(kit.status)}
                        <CardTitle className="text-lg">
                          Kit #{kit.kitNumber}
                        </CardTitle>
                      </div>
                      <Badge className={getKitTypeColor(kit.kitType)}>
                        {getKitTypeDisplayName(kit.kitType)}
                      </Badge>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <CardDescription>
                    {kit.child
                      ? `Child: ${kit.child.firstName || "Unknown"} ${kit.child.lastName || "Name"}`
                      : "Onboarding completed. Status: " +
                        getStatusText(kit.status)}
                  </CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* No kits available */}
      {pendingKits.length === 0 && completedKits.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-500">No kits found for this order.</p>
        </div>
      )}

      <div className="flex justify-between pt-6">
        <Button onClick={onBack} variant="outline">
          Back
        </Button>
        {pendingKits.length === 0 && completedKits.length > 0 && (
          <div className="text-sm text-gray-500">
            All kits have been completed for this order.
          </div>
        )}
      </div>
    </div>
  );
}
