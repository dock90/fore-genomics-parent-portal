"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import OnboardingWizard from "@/components/OnboardingWizard";

export default function ParentInvitationPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [invitationData, setInvitationData] = useState<any>(null);

  useEffect(() => {
    if (isLoaded && user) {
      // Check if user has parent invitation metadata (just to verify they came from an invitation)
      const metadata = user.publicMetadata;

      if (metadata.createdByParentInvitation) {
        // Set minimal invitation data - the actual child data will come from the database
        setInvitationData({
          orderId: metadata.orderId,
          isParentInvitation: true,
        });
      } else {
        // User doesn't have parent invitation metadata, redirect to dashboard
        router.push("/dashboard");
      }
    }
  }, [isLoaded, user, router]);

  // Show loading while Clerk is loading
  if (!isLoaded) {
    return (
      <div className="container-mobile container-tablet container-desktop">
        <div className="mobile-padding mobile-spacing">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Loading...</h2>
            <p className="text-muted-foreground">
              Please wait while we load your invitation...
            </p>
          </div>
        </div>
      </div>
    );
  }

  // If user is not authenticated, redirect to sign-in
  if (!user) {
    router.push("/sign-in");
    return null;
  }

  // If no invitation data, show error
  if (!invitationData) {
    return (
      <div className="container-mobile container-tablet container-desktop">
        <div className="mobile-padding mobile-spacing">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">
                Invalid Invitation
              </h2>
              <p className="text-red-700 mb-4">
                This invitation is not valid or has expired.
              </p>
              <p className="text-sm text-red-600">
                Please contact the person who sent you this invitation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container-mobile container-tablet container-desktop">
      <div className="mobile-padding mobile-spacing">
        <div className="max-w-2xl mx-auto">
          <OnboardingWizard user={null} invitationData={invitationData} />
        </div>
      </div>
    </div>
  );
}
