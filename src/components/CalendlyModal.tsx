"use client";

import { useState, useEffect } from "react";
import { InlineWidget } from "react-calendly";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Calendar, X, Loader2, AlertTriangle } from "lucide-react";
import { isFeatureEnabled } from "@/lib/feature-flags";

interface CalendlyModalProps {
  isOpen: boolean;
  onClose: () => void;
  type: "pre-test" | "post-test";
  userEmail?: string;
  userName?: string;
}

export default function CalendlyModal({
  isOpen,
  onClose,
  type,
  userEmail,
  userName,
}: CalendlyModalProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [schedulingUrl, setSchedulingUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Fetch scheduling URL when modal opens
  useEffect(() => {
    if (isOpen && !schedulingUrl) {
      fetchSchedulingUrl();
    }
  }, [isOpen, type]);

  const fetchSchedulingUrl = async () => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`/api/calendly/scheduling-url?type=${type}`);
      const data = await response.json();

      if (!response.ok) {
        if (data.disabled) {
          throw new Error(
            "Counseling scheduling is temporarily unavailable. Please try again later."
          );
        }
        throw new Error(data.error || "Failed to get scheduling URL");
      }

      setSchedulingUrl(data.schedulingUrl);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load scheduling form"
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Pre-fill form data
  const prefillData = {
    email: userEmail || "",
    name: userName || "",
    // Add any other prefill fields you want
  };

  const title =
    type === "pre-test"
      ? "Schedule Pre-Test Genetic Counseling"
      : "Schedule Post-Test Genetic Counseling";

  const description =
    type === "pre-test"
      ? "Book your pre-test genetic counseling session to discuss the testing process and what to expect."
      : "Book your post-test genetic counseling session to discuss your results and next steps.";

  // Check if Calendly integration is disabled
  if (!isFeatureEnabled("CALENDLY_INTEGRATION")) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
            <div>
              <DialogTitle className="text-xl font-semibold flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-orange-500" />
                Counseling Scheduling Unavailable
              </DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Genetic counseling scheduling is temporarily unavailable
              </p>
            </div>
          </DialogHeader>

          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <AlertTriangle className="w-12 h-12 text-orange-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">
                Service Temporarily Unavailable
              </h3>
              <p className="text-muted-foreground mb-4">
                Genetic counseling scheduling is currently being upgraded and
                will be available soon.
              </p>
              <Button onClick={onClose} variant="outline">
                Close
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
          <div>
            <DialogTitle className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="w-5 h-5" />
              {title}
            </DialogTitle>
            <p className="text-sm text-muted-foreground mt-1">{description}</p>
          </div>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <div className="flex items-center gap-2">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Loading scheduling form...</span>
              </div>
            </div>
          )}

          {error && (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 mb-4">{error}</p>
                <Button onClick={fetchSchedulingUrl} variant="outline">
                  Try Again
                </Button>
              </div>
            </div>
          )}

          {schedulingUrl && !isLoading && !error && (
            <InlineWidget
              url={schedulingUrl}
              styles={{
                height: "600px",
                width: "100%",
              }}
              prefill={prefillData}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
