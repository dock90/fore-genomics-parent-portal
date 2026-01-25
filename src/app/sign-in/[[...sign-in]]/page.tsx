"use client";

import { useSignIn, useAuth } from "@clerk/nextjs";
import { useSearchParams, useRouter } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Loader2, Eye, EyeOff } from "lucide-react";
import Link from "next/link";

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
        
        // Fetch redirect URL and navigate
        await performRedirect();
        // Don't reset loading state - we're navigating away
        return;
      } else {
        // Handle other statuses (e.g., needs_second_factor)
        console.log("Sign in status:", result.status);
        setError("Additional verification required. Please try again.");
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

  return (
    <div className="h-screen flex flex-col lg:flex-row overflow-hidden">
      {/* Left side - Branding (hidden on mobile) */}
      <div className="hidden lg:flex lg:w-1/2 relative overflow-hidden">
        {/* Background Image */}
        <div 
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: "url('/images/sign-in-bg.png')" }}
        />
        {/* Dark Overlay */}
        <div className="absolute inset-0 bg-fore-blue/80" />
        {/* Noise overlay */}
        <div 
          className="absolute inset-0 opacity-10 pointer-events-none"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
            mixBlendMode: 'overlay',
          }}
        />

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-center items-center w-full p-12 text-white">
          <div className="max-w-md text-center space-y-8">
            {/* Tagline */}
            <div className="space-y-4">
              <h1 className="text-4xl xl:text-5xl font-bold leading-tight drop-shadow-md text-white">
                Genetic Testing for Your Child's Future
              </h1>
              <p className="text-xl xl:text-2xl text-white leading-relaxed drop-shadow-sm">
                Advanced genetic testing to help understand your child's health
                and development.
              </p>
            </div>

            {/* Features */}
            <div className="space-y-4 text-left">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
                    />
                  </svg>
                </div>
                <span className="text-white text-lg font-medium drop-shadow-sm">Comprehensive genetic panels</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <span className="text-white text-lg font-medium drop-shadow-sm">Expert analysis by certified counselors</span>
              </div>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-white/30 flex items-center justify-center flex-shrink-0">
                  <svg
                    className="w-5 h-5 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <span className="text-white text-lg font-medium drop-shadow-sm">Personalized support throughout</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Sign In Form */}
      <div className="flex-1 flex flex-col bg-background">
        {/* Sign in form */}
        <div className="flex-1 flex items-center justify-center p-6 sm:p-8">
          <div className="w-full max-w-md space-y-6">
            {/* Welcome text (mobile only) */}
            <div className="lg:hidden text-center space-y-2">
              <h1 className="text-2xl font-bold text-foreground">Welcome Back</h1>
              <p className="text-muted-foreground">Sign in to access the Parent Portal</p>
            </div>

            {/* Desktop welcome text */}
            <div className="hidden lg:block text-center space-y-2 mb-8">
              <h1 className="text-2xl xl:text-3xl font-bold text-foreground">Welcome Back</h1>
              <p className="text-muted-foreground">Sign in to access the Parent Portal</p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Error message */}
              {error && (
                <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
                  {error}
                </div>
              )}

              {/* Email field */}
              <div className="space-y-2">
                <Label htmlFor="email">Email address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isLoading}
                  autoComplete="email"
                  className="h-12"
                />
              </div>

              {/* Password field */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">Password</Label>
                  <Link
                    href="/forgot-password"
                    className="text-sm text-fore-blue hover:text-fore-blue/80 transition-colors"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                    autoComplete="current-password"
                    className="h-12 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit button */}
              <Button
                type="submit"
                className="w-full h-12 text-base bg-fore-blue hover:bg-fore-blue/90"
                disabled={isLoading || !isLoaded}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Signing in...
                  </>
                ) : (
                  "Sign In"
                )}
              </Button>
            </form>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 text-center text-sm text-muted-foreground border-t">
          <p>© 2025 Fore Genomics. All rights reserved.</p>
        </div>
      </div>
    </div>
  );
}
