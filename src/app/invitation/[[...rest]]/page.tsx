"use client";

import { SignUp } from "@clerk/nextjs";
import { useSearchParams } from "next/navigation";

export default function InvitationPage() {
  const searchParams = useSearchParams();
  const redirectUrl = searchParams.get("redirect_url") || "/onboarding";

  return (
    <div className="flex justify-center pt-8">
      <SignUp
        forceRedirectUrl={redirectUrl}
        appearance={{
          elements: {
            formButtonPrimary:
              "bg-[#5e9e8f] border-none !shadow-none hover:bg-[#5e9e8f]/85",
          },
        }}
      />
    </div>
  );
}
