"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function InvitationPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/onboarding";

  return (
    <div className="flex justify-center pt-8">
      <SignUp
        redirectUrl={redirectUrl}
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-[#1D87FA] border-none !shadow-none hover:bg-[#1D87FA]/70",
          },
        }}
      />
    </div>
  );
}
