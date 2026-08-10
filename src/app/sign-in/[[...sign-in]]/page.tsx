"use client";

import { useSignIn, useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import {
  Spinner,
  Eye,
  EyeOff,
  Mail,
  Lock,
  ShieldCheck,
  ArrowRight,
  AlertCircle,
  GoogleMark,
} from "@/components/auth/icons";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";
import { storeAuthRedirect } from "@/lib/auth-oauth";

// Clerk second factor strategies - email_code is used by Client Trust but not in types
type SecondFactorStrategy = "email_code" | "phone_code" | "totp";

export default function Page() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const searchParams = useSearchParams();
  const router = useRouter();
  const explicitRedirect = searchParams.get("redirect_url");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // 2FA / Client Trust verification state
  const [needsSecondFactor, setNeedsSecondFactor] = useState(false);
  const [secondFactorStrategy, setSecondFactorStrategy] = useState<SecondFactorStrategy>("email_code");
  const [verificationCode, setVerificationCode] = useState("");

  // Fetch redirect URL and navigate
  const performRedirect = useCallback(async () => {
    try {
      const apiUrl = explicitRedirect
        ? `/api/auth/redirect?redirect_url=${encodeURIComponent(explicitRedirect)}`
        : "/api/auth/redirect";

      const response = await fetch(apiUrl);
      const data = await response.json();
      router.replace(data.redirectUrl);
    } catch {
      // Fallback to onboarding if API fails
      router.replace("/onboarding");
    }
  }, [explicitRedirect, router]);

  // Redirect if already signed in
  useEffect(() => {
    if (isSignedIn) {
      performRedirect();
    }
  }, [isSignedIn, performRedirect]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.create({
        identifier: email,
        password,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        await performRedirect();
        return;
      } else if (result.status === "needs_second_factor") {
        // Determine which second factor strategy to use
        // Cast to string[] for comparison since Clerk types don't include email_code
        // but Client Trust Credential Stuffing Protection uses it
        const strategies = result.supportedSecondFactors?.map(f => f.strategy as string) ?? [];

        if (strategies.includes("email_code")) {
          // Prepare email code verification (Client Trust)
          await signIn.prepareSecondFactor({ strategy: "email_code" as any });
          setSecondFactorStrategy("email_code");
        } else if (strategies.includes("phone_code")) {
          // Prepare phone code verification
          await signIn.prepareSecondFactor({ strategy: "phone_code" });
          setSecondFactorStrategy("phone_code");
        } else if (strategies.includes("totp")) {
          // TOTP doesn't need preparation
          setSecondFactorStrategy("totp");
        } else {
          setError("No supported second factor method available.");
          setIsLoading(false);
          return;
        }

        setNeedsSecondFactor(true);
      } else {
        setError("Unable to complete sign in. Please try again.");
      }
    } catch (err: any) {
      const errorMessage =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Invalid email or password. Please try again.";
      setError(errorMessage);
    }

    setIsLoading(false);
  };

  const handleSecondFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.attemptSecondFactor({
        strategy: secondFactorStrategy as any,
        code: verificationCode,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        await performRedirect();
        return;
      } else {
        setError("Unable to complete verification. Please try again.");
      }
    } catch (err: any) {
      const errorMessage =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Invalid verification code. Please try again.";
      setError(errorMessage);
    }

    setIsLoading(false);
  };

  const handleResendCode = async () => {
    if (!isLoaded || !signIn || secondFactorStrategy === "totp") return;

    setIsLoading(true);
    setError("");

    try {
      await signIn.prepareSecondFactor({ strategy: secondFactorStrategy as any });
      // Show success feedback
      setError(""); // Clear any previous error
    } catch (err: any) {
      const errorMessage =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Failed to resend code. Please try again.";
      setError(errorMessage);
    }

    setIsLoading(false);
  };

  const handleBackToLogin = () => {
    setNeedsSecondFactor(false);
    setVerificationCode("");
    setError("");
  };

  const handleGoogleSignIn = async () => {
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");
    storeAuthRedirect(explicitRedirect);

    try {
      await signIn.authenticateWithRedirect({
        strategy: "oauth_google",
        redirectUrl: "/sign-in/sso-callback",
        redirectUrlComplete: "/sign-in/sso-complete",
      });
    } catch (err: any) {
      const errorMessage =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Google sign-in is unavailable. Enable Google in the Clerk Dashboard, then try again.";
      setError(errorMessage);
      setIsLoading(false);
    }
  };

  const getSecondFactorTitle = () => {
    switch (secondFactorStrategy) {
      case "email_code":
        return "Check Your Email";
      case "phone_code":
        return "Check Your Phone";
      case "totp":
        return "Two-Factor Authentication";
      default:
        return "Verification Required";
    }
  };

  const getSecondFactorDescription = () => {
    switch (secondFactorStrategy) {
      case "email_code":
        return `We sent a verification code to ${email}`;
      case "phone_code":
        return "We sent a verification code to your phone";
      case "totp":
        return "Enter the code from your authenticator app";
      default:
        return "Enter your verification code";
    }
  };

  const getSecondFactorIcon = () => {
    switch (secondFactorStrategy) {
      case "email_code":
        return <Mail size={24} strokeWidth={1.6} />;
      case "phone_code":
      case "totp":
      default:
        return <ShieldCheck size={24} strokeWidth={1.6} />;
    }
  };

  return (
    <AuthShell>
      {needsSecondFactor ? (
        // Second Factor Verification
        <>
          <div className="fg-iconbadge">{getSecondFactorIcon()}</div>
          <h1 className="fg-title">{getSecondFactorTitle()}</h1>
          <p className="fg-subtitle">{getSecondFactorDescription()}</p>

          <form onSubmit={handleSecondFactor} className="fg-form">
            {error && (
              <div className="fg-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="fg-group">
              <label htmlFor="code" className="fg-label">
                Verification code
              </label>
              <div className="fg-field">
                <input
                  id="code"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  placeholder="000000"
                  value={verificationCode}
                  onChange={(e) =>
                    setVerificationCode(e.target.value.replace(/\D/g, "").slice(0, 6))
                  }
                  required
                  disabled={isLoading}
                  autoComplete="one-time-code"
                  className="fg-input otp"
                  autoFocus
                />
              </div>
            </div>

            <button
              type="submit"
              className="fg-cta"
              disabled={isLoading || !isLoaded || verificationCode.length !== 6}
            >
              <span>
                {isLoading ? (
                  <>
                    <Spinner className="fg-spin" size={18} />
                    Verifying…
                  </>
                ) : (
                  <>
                    Verify
                    <ArrowRight size={18} />
                  </>
                )}
              </span>
            </button>

            <div className="fg-resend">
              {secondFactorStrategy !== "totp" && (
                <button
                  type="button"
                  className="fg-linkbtn"
                  onClick={handleResendCode}
                  disabled={isLoading}
                >
                  Resend code
                </button>
              )}
            </div>
          </form>

          <p className="fg-alt">
            <button type="button" className="fg-linkbtn" onClick={handleBackToLogin} disabled={isLoading}>
              ← Back to sign in
            </button>
          </p>
        </>
      ) : (
        // Sign In
        <>
          <h1 className="fg-title">Welcome back</h1>
          <p className="fg-subtitle">Sign in to access your Health Hub.</p>

          <button
            type="button"
            className="fg-oauth"
            onClick={handleGoogleSignIn}
            disabled={isLoading || !isLoaded}
          >
            {isLoading ? <Spinner className="fg-spin" size={18} /> : <GoogleMark size={18} />}
            Continue with Google
          </button>

          <div className="fg-divider" aria-hidden="true">
            or
          </div>

          <form onSubmit={handleSubmit} className="fg-form after-oauth">
            {error && (
              <div className="fg-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="fg-group">
              <label htmlFor="email" className="fg-label">
                Email address
              </label>
              <div className="fg-field">
                <span className="fg-ficon">
                  <Mail size={18} strokeWidth={1.75} />
                </span>
                <input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="fg-input"
                />
              </div>
            </div>

            <div className="fg-group">
              <div className="fg-rowlabel">
                <label htmlFor="password" className="fg-label">
                  Password
                </label>
                <Link href="/forgot-password" className="fg-forgot">
                  Forgot password?
                </Link>
              </div>
              <div className="fg-field">
                <span className="fg-ficon">
                  <Lock size={18} strokeWidth={1.75} />
                </span>
                <input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="current-password"
                  className="fg-input pw"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="fg-eye"
                  tabIndex={-1}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="fg-cta" disabled={isLoading || !isLoaded}>
              <span>
                {isLoading ? (
                  <>
                    <Spinner className="fg-spin" size={18} />
                    Signing in…
                  </>
                ) : (
                  <>
                    Sign in
                    <ArrowRight size={18} />
                  </>
                )}
              </span>
            </button>
          </form>
        </>
      )}
    </AuthShell>
  );
}
