"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SignOutButton } from "@clerk/nextjs";
import OnboardingWizard from "@/components/OnboardingWizard";

export default function ParentInvitationPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);
  const [invitationData, setInvitationData] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [emailMismatch, setEmailMismatch] = useState(false);

  const token = searchParams.get("token");

  useEffect(() => {
    async function validateToken() {
      console.log("Parent invitation page loaded with token:", token);
      console.log("Current URL:", window.location.href);
      console.log("User loaded:", isLoaded, "User:", user?.primaryEmailAddress?.emailAddress);
      
      if (!token) {
        setError("No invitation token provided");
        setIsValidating(false);
        return;
      }

      // Only validate if user is authenticated
      if (!isLoaded || !user) {
        setIsValidating(false);
        return;
      }

      try {
        const response = await fetch("/api/onboarding/validate-invitation", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ token }),
        });

        if (!response.ok) {
          const errorData = await response.json();
          setError(errorData.error || "Invalid or expired invitation");
          setIsValidating(false);
          return;
        }

        const data = await response.json();
        setInvitationData(data.invitation);
        
        // Check if current user's email matches invitation email
        if (user && user.primaryEmailAddress?.emailAddress !== data.invitation.parentEmail) {
          setEmailMismatch(true);
          setIsValidating(false);
          return;
        }
        
        setIsValid(true);
        setIsValidating(false);
      } catch (err) {
        console.error("Token validation error:", err);
        setError("Failed to validate invitation");
        setIsValidating(false);
      }
    }

    // Only run validation when we have a token and user is loaded
    if (token && isLoaded) {
      validateToken();
    }
  }, [token, user?.id, isLoaded]);

  // Show loading while Clerk is loading
  if (!isLoaded || isValidating) {
    return (
      <div className="container-mobile container-tablet container-desktop">
        <div className="mobile-padding mobile-spacing">
          <div className="max-w-2xl mx-auto text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <h2 className="text-xl font-semibold mb-2">Validating Invitation</h2>
            <p className="text-muted-foreground">Please wait while we verify your invitation...</p>
          </div>
        </div>
      </div>
    );
  }

  if (emailMismatch) {
    return (
      <div className="container-mobile container-tablet container-desktop">
        <div className="mobile-padding mobile-spacing">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-yellow-800 mb-2">Email Mismatch</h2>
              <p className="text-yellow-700 mb-4">
                This invitation was sent to <strong>{invitationData?.parentEmail}</strong>, 
                but you're currently signed in as <strong>{user?.primaryEmailAddress?.emailAddress}</strong>.
              </p>
              <p className="text-sm text-yellow-600 mb-6">
                You need to sign out and sign in with the email address that received this invitation ({invitationData?.parentEmail}).
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <SignOutButton>
                  <button className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors">
                    Sign Out & Sign In with Correct Email
                  </button>
                </SignOutButton>
                <button 
                  onClick={() => router.push("/")}
                  className="bg-gray-200 text-gray-800 px-6 py-2 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Go to Home
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container-mobile container-tablet container-desktop">
        <div className="mobile-padding mobile-spacing">
          <div className="max-w-2xl mx-auto text-center">
            <div className="bg-red-50 border border-red-200 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-red-800 mb-2">Invalid Invitation</h2>
              <p className="text-red-700 mb-4">{error}</p>
              <p className="text-sm text-red-600">
                This invitation may have expired or is no longer valid. 
                Please contact the person who sent you this invitation.
              </p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!isValid || !invitationData) {
    return null;
  }

  return (
    <div className="container-mobile container-tablet container-desktop">
      <div className="mobile-padding mobile-spacing">
        <div className="max-w-2xl mx-auto">
          <OnboardingWizard invitationData={invitationData} />
        </div>
      </div>
    </div>
  );
} 