import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar, Mail, Baby } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { formatDateForDisplay } from "@/lib/utils";

export default function UnbornChildConfirmationStep({
  childInfo,
  userInfo,
  onBack,
  onContinueOnboarding,
}: any) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);
  const [hasOtherIncompleteOrders, setHasOtherIncompleteOrders] =
    React.useState(false);
  const hasSavedRef = React.useRef(false);

  // Save unborn child data when component mounts
  React.useEffect(() => {
    console.log(
      "UnbornChildConfirmationStep useEffect running, hasSavedRef.current:",
      hasSavedRef.current
    );
    if (hasSavedRef.current) return; // Prevent multiple API calls

    const saveUnbornChildData = async () => {
      console.log("Saving unborn child data:", { userInfo, childInfo });
      setSaving(true);
      try {
        const response = await fetch("/api/onboarding/unborn-child", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            userInfo,
            childInfo,
          }),
        });

        console.log("API response status:", response.status);

        if (!response.ok) {
          const errorData = await response.json().catch(() => ({}));
          console.error("API error response:", errorData);
          throw new Error(
            `Failed to save unborn child data: ${response.status} ${errorData.error || ""}`
          );
        }

        const responseData = await response.json();
        console.log("Data saved successfully:", responseData);
        hasSavedRef.current = true; // Mark as saved to prevent future calls

        // Check if there are other incomplete orders
        if (responseData.hasOtherIncompleteOrders) {
          console.log("Setting hasOtherIncompleteOrders to true");
          setHasOtherIncompleteOrders(true);
        } else {
          console.log(
            "No other incomplete orders, hasOtherIncompleteOrders remains false"
          );
        }
      } catch (error) {
        console.error("Error saving unborn child data:", error);
        setSaveError(
          `Failed to save your information: ${error instanceof Error ? error.message : "Unknown error"}`
        );
      } finally {
        setSaving(false);
      }
    };

    saveUnbornChildData();
  }, [userInfo, childInfo]);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="text-center space-y-4">
        <div className="flex justify-center">
          <div className="bg-green-100 p-3 rounded-full">
            <Baby className="h-8 w-8 text-green-600" />
          </div>
        </div>
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">
          Thank You for Your Registration!
        </h1>
        <p className="text-lg text-gray-600">
          {saving
            ? "Saving your information..."
            : saveError
              ? "There was an issue saving your information."
              : hasOtherIncompleteOrders
                ? "We've saved your unborn child information. You still need to complete onboarding for your other kit(s)."
                : "We've received your information and will follow up with you after your due date."}
        </p>
        {saveError && <p className="text-sm text-red-600">{saveError}</p>}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Due Date Reminder
          </CardTitle>
          <CardDescription>
            We'll contact you after {formatDateForDisplay(childInfo.dueDate)} to
            complete the onboarding process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">
                Due Date
              </h4>
              <p className="text-lg font-semibold">
                {formatDateForDisplay(childInfo.dueDate)}
              </p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">
                Contact Email
              </h4>
              <p className="text-lg font-semibold">
                {userInfo?.email || "Your registered email"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {hasOtherIncompleteOrders ? (
        <Card className="border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-orange-800 dark:text-orange-200">
              <Mail className="h-5 w-5" />
              Complete Onboarding for Other Kit(s)
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 p-1 rounded-full mt-1">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium">Continue onboarding</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  You still need to complete the onboarding process for your
                  other kit(s)
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-orange-100 p-1 rounded-full mt-1">
                <div className="w-2 h-2 bg-orange-600 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium">Separate orders</p>
                <p className="text-sm text-orange-700 dark:text-orange-300">
                  Your unborn child now has their own order and won't affect the
                  testing of your other kit(s)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              What Happens Next?
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-1 rounded-full mt-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium">After your due date</p>
                <p className="text-sm text-gray-600">
                  We'll send you an email reminder to complete the onboarding
                  process
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-1 rounded-full mt-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium">Complete onboarding</p>
                <p className="text-sm text-gray-600">
                  You'll be able to add your child's name, date of birth, and
                  other details
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="bg-blue-100 p-1 rounded-full mt-1">
                <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
              </div>
              <div>
                <p className="font-medium">Submit test</p>
                <p className="text-sm text-gray-600">
                  After you receive your test kit, you'll be able to submit your
                  child's DNA sample and schedule a genetic counseling
                  appointment
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        <Button
          onClick={() => {
            console.log(
              "Button clicked! hasOtherIncompleteOrders:",
              hasOtherIncompleteOrders,
              "onContinueOnboarding:",
              !!onContinueOnboarding
            );
            if (hasOtherIncompleteOrders && onContinueOnboarding) {
              console.log("Calling onContinueOnboarding");
              onContinueOnboarding();
            } else {
              console.log("Navigating to dashboard");
              router.push("/dashboard");
            }
          }}
          className="w-full sm:w-auto text-sm sm:text-base py-3 sm:py-4"
        >
          {hasOtherIncompleteOrders ? "Continue Onboarding" : "Go to Dashboard"}
        </Button>
      </div>
    </div>
  );
}
