import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCircle, Mail, ArrowRight } from "lucide-react";
import * as React from "react";

export default function InvitationConfirmationStep() {
  return (
    <div className="space-y-6 sm:space-y-8">
      <div className="text-center">
        <div className="flex justify-center mb-4">
          <div className="bg-green-100 p-3 rounded-full">
            <CheckCircle className="h-8 w-8 text-green-600" />
          </div>
        </div>
        
        <h2 className="text-xl sm:text-2xl font-semibold text-foreground mb-2">
          Invitation Sent Successfully
        </h2>
        
        <p className="text-muted-foreground text-sm sm:text-base">
          We've sent an invitation to the parent or legal guardian to complete the onboarding process.
        </p>
      </div>

      <Card className="border-green-200 bg-green-50/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-800">
            <Mail className="h-5 w-5" />
            What happens next?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1 rounded-full mt-0.5">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Email invitation sent</p>
                <p className="text-xs text-green-700">The parent or legal guardian will receive an email with a secure link to access the parent portal.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1 rounded-full mt-0.5">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Parent completes onboarding</p>
                <p className="text-xs text-green-700">They'll need to provide their information, complete the consent forms, and answer health questions.</p>
              </div>
            </div>
            
            <div className="flex items-start gap-3">
              <div className="bg-green-100 p-1 rounded-full mt-0.5">
                <div className="w-2 h-2 bg-green-600 rounded-full"></div>
              </div>
              <div>
                <p className="text-sm font-medium text-green-800">Test kit preparation</p>
                <p className="text-xs text-green-700">Once onboarding is complete, we'll prepare and ship the test kit to the family.</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-blue-200 bg-blue-50/50">
        <CardHeader>
          <CardTitle className="text-blue-800 text-base">
            Important Information
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 text-sm">
            <p className="text-blue-800">
              <strong>Invitation expires in 7 days.</strong> If the parent or legal guardian doesn't complete the process within this time, you may need to send a new invitation.
            </p>
            <p className="text-blue-800">
              <strong>Only parents or legal guardians</strong> can provide consent for genetic testing. This is a legal requirement to protect the child's rights and privacy.
            </p>
            <p className="text-blue-800">
              <strong>You'll be notified</strong> once the parent or legal guardian completes the onboarding process.
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="text-center pt-4">
        <p className="text-sm text-muted-foreground mb-4">
          Thank you for helping connect us with the child's parent or legal guardian. 
          You will be notified once they complete the onboarding process.
        </p>
        <p className="text-xs text-muted-foreground">
          You can close this window or navigate away from the site.
        </p>
      </div>
    </div>
  );
} 