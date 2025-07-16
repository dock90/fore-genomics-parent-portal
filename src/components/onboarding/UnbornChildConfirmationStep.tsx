import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Mail, Baby } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";

export default function UnbornChildConfirmationStep({ childInfo, userInfo, onBack }: any) {
  const router = useRouter();
  const [saving, setSaving] = React.useState(false);
  const [saveError, setSaveError] = React.useState<string | null>(null);

  // Save unborn child data when component mounts
  React.useEffect(() => {
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
          throw new Error(`Failed to save unborn child data: ${response.status} ${errorData.error || ''}`);
        }

        console.log("Data saved successfully");
        // Data saved successfully
      } catch (error) {
        console.error("Error saving unborn child data:", error);
        setSaveError(`Failed to save your information: ${error instanceof Error ? error.message : 'Unknown error'}`);
      } finally {
        setSaving(false);
      }
    };

    saveUnbornChildData();
  }, [userInfo, childInfo]);
  
  const formatDate = (dateString: string) => {
    // Create date in local timezone to avoid timezone conversion issues
    const [year, month, day] = dateString.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };



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
          {saving ? "Saving your information..." : 
           saveError ? "There was an issue saving your information." :
           "We've received your information and will follow up with you after your due date."}
        </p>
        {saveError && (
          <p className="text-sm text-red-600">
            {saveError}
          </p>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Due Date Reminder
          </CardTitle>
          <CardDescription>
            We'll contact you after {formatDate(childInfo.dueDate)} to complete the onboarding process.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Due Date</h4>
              <p className="text-lg font-semibold">{formatDate(childInfo.dueDate)}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide">Contact Email</h4>
              <p className="text-lg font-semibold">{userInfo?.email || 'Your registered email'}</p>
            </div>
          </div>
        </CardContent>
      </Card>

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
              <p className="text-sm text-gray-600">We'll send you an email reminder to complete the onboarding process</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-1 rounded-full mt-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
            <div>
              <p className="font-medium">Complete onboarding</p>
              <p className="text-sm text-gray-600">You'll be able to add your child's name, date of birth, and other details</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <div className="bg-blue-100 p-1 rounded-full mt-1">
              <div className="w-2 h-2 bg-blue-600 rounded-full"></div>
            </div>
            <div>
              <p className="font-medium">Submit test</p>
              <p className="text-sm text-gray-600">After you receive your test kit, you'll be able to submit your child's DNA sample and schedule a genetic counseling appointment</p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex flex-col sm:flex-row gap-3 pt-4">
        {onBack && (
          <Button 
            type="button" 
            variant="outline" 
            className="w-full sm:w-auto text-sm sm:text-base py-3 sm:py-4" 
            onClick={onBack}
          >
            Back
          </Button>
        )}
        <Button 
          onClick={() => router.push("/dashboard")}
          className="w-full sm:w-auto text-sm sm:text-base py-3 sm:py-4"
        >
          Go to Dashboard
        </Button>
      </div>
    </div>
  );
} 