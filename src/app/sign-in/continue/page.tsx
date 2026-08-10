"use client";

import { useSignUp } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { AuthShell } from "@/components/auth/AuthShell";
import { AlertCircle, ArrowRight, Spinner } from "@/components/auth/icons";

export default function SignInContinuePage() {
  const { isLoaded, signUp, setActive } = useSignUp();
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (!isLoaded) return;
    if (!signUp?.id) {
      router.replace("/sign-in");
      return;
    }
    if (signUp.status === "complete" && signUp.createdSessionId) {
      void setActive({ session: signUp.createdSessionId }).then(() => {
        router.replace("/sign-in/sso-complete");
      });
    }
  }, [isLoaded, signUp, setActive, router]);

  if (!isLoaded || !signUp?.id) {
    return (
      <AuthShell>
        <div className="fg-iconbadge">
          <Spinner className="fg-spin" size={24} />
        </div>
        <h1 className="fg-title">Almost there</h1>
        <p className="fg-subtitle">Loading your account…</p>
      </AuthShell>
    );
  }

  const missing = signUp.missingFields ?? [];
  const needsNames = missing.includes("first_name") || missing.includes("last_name");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!signUp) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signUp.update({
        ...(missing.includes("first_name") ? { firstName } : {}),
        ...(missing.includes("last_name") ? { lastName } : {}),
      });

      if (result.status === "complete" && result.createdSessionId) {
        await setActive({ session: result.createdSessionId });
        router.replace("/sign-in/sso-complete");
        return;
      }

      setError("We still need a bit more information. Please contact support if this continues.");
    } catch (err: any) {
      setError(
        err.errors?.[0]?.longMessage ||
          err.errors?.[0]?.message ||
          "Unable to finish sign-up. Please try again.",
      );
    }

    setIsLoading(false);
  };

  return (
    <AuthShell>
      <h1 className="fg-title">Finish your account</h1>
      <p className="fg-subtitle">
        Google signed you in — we just need a couple of details to finish setup.
      </p>

      <form onSubmit={handleSubmit} className="fg-form">
        {error && (
          <div className="fg-error">
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        {needsNames && (
          <>
            {missing.includes("first_name") && (
              <div className="fg-group">
                <label htmlFor="firstName" className="fg-label">
                  First name
                </label>
                <div className="fg-field">
                  <input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="given-name"
                    className="fg-input plain"
                  />
                </div>
              </div>
            )}
            {missing.includes("last_name") && (
              <div className="fg-group">
                <label htmlFor="lastName" className="fg-label">
                  Last name
                </label>
                <div className="fg-field">
                  <input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="family-name"
                    className="fg-input plain"
                  />
                </div>
              </div>
            )}
          </>
        )}

        {!needsNames && (
          <p className="fg-subtitle">
            Additional fields are required for this account. Please contact support@foregenomics.com.
          </p>
        )}

        <div id="clerk-captcha" />

        {needsNames && (
          <button type="submit" className="fg-cta" disabled={isLoading}>
            <span>
              {isLoading ? (
                <>
                  <Spinner className="fg-spin" size={18} />
                  Saving…
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight size={18} />
                </>
              )}
            </span>
          </button>
        )}
      </form>
    </AuthShell>
  );
}
