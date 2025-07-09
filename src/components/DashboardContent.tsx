"use client";

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { UserButton } from "@clerk/nextjs";
import { format } from "date-fns";
import { Calendar, Clock, AlertCircle, CheckCircle } from "lucide-react";
import OrderStatusCard from "@/components/OrderStatusCard";

interface DashboardContentProps {
  user: any;
  order?: any;
}

// Function to format phone number for display
function formatPhoneForDisplay(phone: string): string {
  if (!phone) return 'Not provided';
  
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '');
  
  // Handle US phone numbers (10 digits)
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  
  // Handle US phone numbers with country code (11 digits starting with 1)
  if (digits.length === 11 && digits.startsWith('1')) {
    const withoutCountry = digits.slice(1);
    return `(${withoutCountry.slice(0, 3)}) ${withoutCountry.slice(3, 6)}-${withoutCountry.slice(6)}`;
  }
  
  // For other formats, return as is or with basic formatting
  if (digits.length > 0) {
    return phone; // Return original format if it's already formatted
  }
  
  return 'Not provided';
}

export default function DashboardContent({ user, order }: DashboardContentProps) {
  const profile = user.profile;
  const child = user.children[0];
  const consent = user.consents[0];
  const questionnaire = user.questionnaires[0];

  // Determine if counseling prompts should be shown
  const showPreTestCounseling = !user.preTestCounselingScheduled;
  const showPostTestCounseling = user.postTestCounselingScheduled === false && 
    order?.status === 'COMPLETE_REPORT_DELIVERED';

  return (
    <div className="container-mobile container-tablet container-desktop">
      <div className="mobile-padding mobile-spacing">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-6 sm:mb-8">
          <div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-foreground">
              Welcome back!
            </h1>
            <p className="text-muted-foreground mt-1">
              Here's your genetic testing information
            </p>
          </div>
        </div>

        {/* Genetic Counseling Prompts */}
        {(showPreTestCounseling || showPostTestCounseling) && (
          <div className="mb-6 sm:mb-8 space-y-4 sm:space-y-6">
            {showPreTestCounseling && (
              <Card className="w-full border-orange-200 bg-orange-50 dark:border-orange-800 dark:bg-orange-950/20">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-orange-800 dark:text-orange-200">
                    <AlertCircle className="w-5 h-5" />
                    Pre-Test Genetic Counseling Required
                  </CardTitle>
                  <CardDescription className="text-orange-700 dark:text-orange-300">
                    Schedule your pre-test genetic counseling session before proceeding with testing
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm sm:text-base text-orange-700 dark:text-orange-300 space-y-2">
                    <p>Pre-test genetic counseling helps you:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Understand what the genetic test will reveal</li>
                      <li>Discuss potential outcomes and their implications</li>
                      <li>Address any concerns or questions you may have</li>
                      <li>Make informed decisions about testing</li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button 
                      className="w-full sm:w-auto bg-orange-600 hover:bg-orange-700 text-white"
                      onClick={() => alert('TODO: Calendly Integration - Pre-Test Counseling')}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Pre-Test Counseling
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {showPostTestCounseling && (
              <Card className="w-full border-blue-200 bg-blue-50 dark:border-blue-800 dark:bg-blue-950/20">
                <CardHeader className="pb-3 sm:pb-4">
                  <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-blue-800 dark:text-blue-200">
                    <Clock className="w-5 h-5" />
                    Post-Test Genetic Counseling Available
                  </CardTitle>
                  <CardDescription className="text-blue-700 dark:text-blue-300">
                    Your test results are ready. Schedule a post-test counseling session to discuss your results
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-sm sm:text-base text-blue-700 dark:text-blue-300 space-y-2">
                    <p>Post-test genetic counseling helps you:</p>
                    <ul className="list-disc list-inside space-y-1 ml-4">
                      <li>Understand your test results and their meaning</li>
                      <li>Discuss next steps and recommendations</li>
                      <li>Address any questions or concerns</li>
                      <li>Plan for your child's healthcare needs</li>
                    </ul>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-3 sm:gap-4">
                    <Button 
                      className="w-full sm:w-auto bg-blue-600 hover:bg-blue-700 text-white"
                      onClick={() => alert('TODO: Calendly Integration - Post-Test Counseling')}
                    >
                      <Calendar className="w-4 h-4 mr-2" />
                      Schedule Post-Test Counseling
                    </Button>
                    <Button variant="outline" className="w-full sm:w-auto border-blue-300 text-blue-700 hover:bg-blue-100 dark:border-blue-700 dark:text-blue-300 dark:hover:bg-blue-950/30">
                      View Results First
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        )}

        {/* Information Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mb-6 sm:mb-8">
          {/* Parent Information */}
          <Card className="w-full">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                Parent Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Name:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {profile?.firstName} {profile?.lastName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Email:</span>
                <span className="text-sm sm:text-base text-muted-foreground break-all">
                  {user.email}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Phone:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {formatPhoneForDisplay(profile?.phone)}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Address:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {profile?.address ? (
                    <>
                      {profile.address}<br />
                      {profile?.city}, {profile?.state} {profile?.zipCode}
                    </>
                  ) : (
                    'Not provided'
                  )}
                </span>
              </div>
              {/* Genetic Counseling Status */}
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2 pt-2 border-t">
                <span className="font-medium text-sm sm:text-base">Pre-Test Counseling:</span>
                <span className="text-sm sm:text-base flex items-center gap-1">
                  {user.preTestCounselingScheduled ? (
                    <>
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      <span className="text-green-600">Scheduled</span>
                    </>
                  ) : (
                    <>
                      <AlertCircle className="w-4 h-4 text-orange-600" />
                      <span className="text-orange-600">Not Scheduled</span>
                    </>
                  )}
                </span>
              </div>
              {user.postTestCounselingScheduled !== undefined && (
                <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                  <span className="font-medium text-sm sm:text-base">Post-Test Counseling:</span>
                  <span className="text-sm sm:text-base flex items-center gap-1">
                    {user.postTestCounselingScheduled ? (
                      <>
                        <CheckCircle className="w-4 h-4 text-green-600" />
                        <span className="text-green-600">Scheduled</span>
                      </>
                    ) : (
                      <>
                        <Clock className="w-4 h-4 text-blue-600" />
                        <span className="text-blue-600">Available</span>
                      </>
                    )}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Child Information */}
          <Card className="w-full">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="text-lg sm:text-xl flex items-center gap-2">
                Child Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 sm:space-y-4">
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Name:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {child?.firstName} {child?.lastName}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Date of Birth:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {child?.dob ? format(new Date(child.dob), 'MMM dd, yyyy') : 'Not provided'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Sex:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {child?.sex || 'Not provided'}
                </span>
              </div>
              <div className="flex flex-col sm:flex-row sm:justify-between gap-1 sm:gap-2">
                <span className="font-medium text-sm sm:text-base">Ethnicity:</span>
                <span className="text-sm sm:text-base text-muted-foreground">
                  {child?.ethnicity || 'Not provided'}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Order Status Card */}
        {order && (
          <div className="mb-6 sm:mb-8">
            <OrderStatusCard order={order} />
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Button variant="outline" className="w-full sm:w-auto">
            Update Information
          </Button>
          <Button className="w-full sm:w-auto">
            Contact Support
          </Button>
        </div>
      </div>
    </div>
  );
} 