"use client";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar, Mail, Baby, Clock, Info } from "lucide-react";
import { useRouter } from "next/navigation";
import * as React from "react";
import { formatDateForDisplay, getDaysUntilDate } from "@/lib/utils";

interface UnbornChildDashboardProps {
  user: any;
  unbornChild: any;
}

export default function UnbornChildDashboard({
  user,
  unbornChild,
}: UnbornChildDashboardProps) {
  const router = useRouter();

  const formatPhoneNumber = (phone: string) => {
    if (!phone) return "Not provided";

    // Remove all non-digits
    const digits = phone.replace(/\D/g, "");

    // Handle US numbers with country code (+1)
    if (digits.length === 11 && digits.startsWith("1")) {
      // Remove the country code and format as (XXX) XXX-XXXX
      const usDigits = digits.slice(1);
      return `(${usDigits.slice(0, 3)}) ${usDigits.slice(3, 6)}-${usDigits.slice(6)}`;
    }

    // Handle 10-digit US numbers
    if (digits.length === 10) {
      return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
    }

    // If it doesn't match the expected format, return as is
    return phone;
  };

  const daysUntilDue = getDaysUntilDate(unbornChild?.dueDate);
  const isOverdue = daysUntilDue < 0;
  const isDueSoon = daysUntilDue <= 7 && daysUntilDue >= 0;

  return (
    <>
      {/* Header */}
      <div className="mb-8">
        <p className="text-gray-600">
          We're looking forward to helping you with genetic testing after your
          little one arrives.
        </p>
      </div>

      {/* Due Date Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Due Date: {formatDateForDisplay(unbornChild?.dueDate)}
          </CardTitle>
          <CardDescription>
            {isOverdue
              ? "Your due date has passed. We'll be in touch soon!"
              : isDueSoon
                ? "Your due date is approaching!"
                : "We'll contact you after your due date to complete the onboarding process."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide mb-1">
                {isOverdue ? "Days Since Due Date" : "Days Until Due Date"}
              </h4>
              <p
                className={`text-2xl font-bold ${isOverdue ? "text-red-600" : isDueSoon ? "text-orange-600" : "text-blue-600"}`}
              >
                {Math.abs(daysUntilDue)}{" "}
                {Math.abs(daysUntilDue) === 1 ? "day" : "days"}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Status Card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Current Status
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-start gap-4">
            <div className="bg-blue-100 p-3 rounded-full">
              <Baby className="h-6 w-6 text-blue-600" />
            </div>
            <div className="flex-1">
              <h4 className="font-semibold text-gray-900 mb-2">
                {isOverdue
                  ? "Ready to Complete Onboarding"
                  : isDueSoon
                    ? "Almost Time!"
                    : "Waiting for Baby"}
              </h4>
              <p className="text-gray-600 mb-3">
                {isOverdue
                  ? "Your due date has passed. We'll send you an email soon to complete the onboarding process."
                  : isDueSoon
                    ? "Your due date is just around the corner. We'll be in touch shortly after your little one arrives."
                    : "We have your information saved and will contact you after your due date to complete the onboarding process."}
              </p>
              {isOverdue && (
                <Button
                  onClick={() => router.push("/onboarding")}
                  className="mt-2"
                >
                  Complete Testing Now
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Contact Information */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Contact Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide mb-1">
                Email Address
              </h4>
              <p className="text-gray-900">{user.email}</p>
            </div>
            <div>
              <h4 className="font-medium text-sm text-gray-500 uppercase tracking-wide mb-1">
                Phone Number
              </h4>
              <p className="text-gray-900">
                {formatPhoneNumber(user.profile?.phone)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* What Happens Next */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Info className="h-5 w-5" />
            What Happens Next?
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1 rounded-full mt-1">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
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
              <div className="bg-green-100 p-1 rounded-full mt-1">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
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
              <div className="bg-green-100 p-1 rounded-full mt-1">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
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
          </div>
        </CardContent>
      </Card>
    </>
  );
}
