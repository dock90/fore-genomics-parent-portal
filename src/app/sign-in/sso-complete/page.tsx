"use client";

import { useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { Spinner } from "@/components/auth/icons";
import { clearStoredAuthRedirect, readStoredAuthRedirect } from "@/lib/auth-oauth";

export default function SsoCompletePage() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const started = useRef(false);

  useEffect(() => {
    if (!isLoaded || started.current) return;
    started.current = true;

    const finish = async () => {
      if (!isSignedIn) {
        router.replace("/sign-in");
        return;
      }

      const stored = readStoredAuthRedirect();
      clearStoredAuthRedirect();

      try {
        const apiUrl = stored
          ? `/api/auth/redirect?redirect_url=${encodeURIComponent(stored)}`
          : "/api/auth/redirect";
        const response = await fetch(apiUrl);
        const data = await response.json();
        const target = typeof data.redirectUrl === "string" ? data.redirectUrl : "/onboarding";
        if (target.startsWith("http")) {
          window.location.href = target;
        } else {
          router.replace(target);
        }
      } catch {
        router.replace("/onboarding");
      }
    };

    void finish();
  }, [isLoaded, isSignedIn, router]);

  return (
    <AuthShell>
      <div className="fg-iconbadge">
        <Spinner className="fg-spin" size={24} />
      </div>
      <h1 className="fg-title">Signing you in</h1>
      <p className="fg-subtitle">One moment while we finish Google sign-in.</p>
    </AuthShell>
  );
}
