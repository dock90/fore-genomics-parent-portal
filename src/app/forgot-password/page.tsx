"use client";

import { useSignIn, useAuth } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Spinner, ArrowLeft, Eye, EyeOff, CheckCircle, Mail, Lock, Key, ArrowRight, AlertCircle } from "@/components/auth/icons";
import Link from "next/link";
import { AuthShell } from "@/components/auth/AuthShell";

type ResetStep = "email" | "code" | "success";

export default function ForgotPasswordPage() {
  const { isLoaded, signIn, setActive } = useSignIn();
  const { isSignedIn } = useAuth();
  const router = useRouter();

  // Fetch redirect URL and navigate
  const performRedirect = useCallback(async () => {
    try {
      const response = await fetch("/api/auth/redirect");
      const data = await response.json();
      router.replace(data.redirectUrl);
    } catch {
      router.replace("/onboarding");
    }
  }, [router]);

  // Redirect if already signed in
  useEffect(() => {
    if (isSignedIn) {
      performRedirect();
    }
  }, [isSignedIn, performRedirect]);

  const [step, setStep] = useState<ResetStep>("email");
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Step 1: Request password reset code
  const handleRequestCode = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });

      setStep("code");
    } catch (err: any) {
      const errorMessage =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Unable to send reset code. Please check your email and try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Step 2: Verify code and set new password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isLoaded || !signIn) return;

    if (newPassword !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (newPassword.length < 8) {
      setError("Password must be at least 8 characters long.");
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const result = await signIn.attemptFirstFactor({
        strategy: "reset_password_email_code",
        code,
        password: newPassword,
      });

      if (result.status === "complete") {
        await setActive({ session: result.createdSessionId });
        setStep("success");
      } else {
        setError("Unable to reset password. Please try again.");
      }
    } catch (err: any) {
      const errorMessage =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Invalid code or password. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  // Resend code
  const handleResendCode = async () => {
    if (!isLoaded || !signIn) return;

    setIsLoading(true);
    setError("");

    try {
      await signIn.create({
        strategy: "reset_password_email_code",
        identifier: email,
      });
      setError(""); // Clear any previous errors
    } catch (err: any) {
      const errorMessage =
        err.errors?.[0]?.longMessage ||
        err.errors?.[0]?.message ||
        "Unable to resend code. Please try again.";
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthShell>
      {step !== "success" && (
        <Link href="/sign-in" className="fg-back">
          <ArrowLeft size={15} />
          Back to sign in
        </Link>
      )}

      {step === "email" && (
        <>
          <div className="fg-iconbadge">
            <Key size={24} strokeWidth={1.6} />
          </div>
          <h1 className="fg-title">Reset your password</h1>
          <p className="fg-subtitle">
            Enter your email and we&apos;ll send you a secure code to reset your password.
          </p>

          <form onSubmit={handleRequestCode} className="fg-form">
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

            <button type="submit" className="fg-cta" disabled={isLoading || !isLoaded}>
              <span>
                {isLoading ? (
                  <>
                    <Spinner className="fg-spin" size={18} />
                    Sending code…
                  </>
                ) : (
                  <>
                    Send reset code
                    <ArrowRight size={18} />
                  </>
                )}
              </span>
            </button>
          </form>
        </>
      )}

      {step === "code" && (
        <>
          <div className="fg-iconbadge">
            <Mail size={24} strokeWidth={1.75} />
          </div>
          <h1 className="fg-title">Check your email</h1>
          <p className="fg-subtitle">
            We sent a code to <b>{email}</b>. Enter it below with your new password.
          </p>

          <form onSubmit={handleResetPassword} className="fg-form">
            {error && (
              <div className="fg-error">
                <AlertCircle size={16} />
                <span>{error}</span>
              </div>
            )}

            <div className="fg-group">
              <label htmlFor="code" className="fg-label">
                Reset code
              </label>
              <div className="fg-field">
                <span className="fg-ficon">
                  <Key size={18} strokeWidth={1.6} />
                </span>
                <input
                  id="code"
                  type="text"
                  placeholder="Enter the code from your email"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="one-time-code"
                  className="fg-input"
                />
              </div>
            </div>

            <div className="fg-group">
              <label htmlFor="newPassword" className="fg-label">
                New password
              </label>
              <div className="fg-field">
                <span className="fg-ficon">
                  <Lock size={18} strokeWidth={1.75} />
                </span>
                <input
                  id="newPassword"
                  type={showPassword ? "text" : "password"}
                  placeholder="Create a new password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
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

            <div className="fg-group">
              <label htmlFor="confirmPassword" className="fg-label">
                Confirm password
              </label>
              <div className="fg-field">
                <span className="fg-ficon">
                  <Lock size={18} strokeWidth={1.75} />
                </span>
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  placeholder="Confirm your new password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="new-password"
                  className="fg-input pw"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="fg-eye"
                  tabIndex={-1}
                  aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button type="submit" className="fg-cta" disabled={isLoading || !isLoaded}>
              <span>
                {isLoading ? (
                  <>
                    <Spinner className="fg-spin" size={18} />
                    Resetting password…
                  </>
                ) : (
                  <>
                    Reset password
                    <ArrowRight size={18} />
                  </>
                )}
              </span>
            </button>

            <div className="fg-resend">
              <button
                type="button"
                onClick={handleResendCode}
                disabled={isLoading}
                className="fg-linkbtn"
              >
                Didn&apos;t receive the code? Resend
              </button>
            </div>
          </form>
        </>
      )}

      {step === "success" && (
        <div style={{ textAlign: "center" }}>
          <div
            className="fg-iconbadge success"
            style={{ margin: "0 auto 22px", width: 64, height: 64, borderRadius: 20 }}
          >
            <CheckCircle size={30} strokeWidth={1.75} />
          </div>
          <h1 className="fg-title">Password reset</h1>
          <p className="fg-subtitle">
            Your password has been successfully reset. You&apos;re now signed in.
          </p>
          <button onClick={() => performRedirect()} className="fg-cta" style={{ marginTop: 28 }}>
            <span>
              Continue to portal
              <ArrowRight size={18} />
            </span>
          </button>
        </div>
      )}
    </AuthShell>
  );
}
