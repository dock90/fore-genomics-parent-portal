"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-top">
      <div className="container-mobile container-tablet container-desktop">
        <div className="flex h-16 sm:h-18 items-center justify-between gap-3 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center h-full">
            <img
              src="/images/logos/fore_genomics_logo.png"
              alt="Fore Genomics Logo"
              className="h-8 w-auto sm:h-10 lg:h-12"
            />
          </div>
          
          {/* Navigation/Actions */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <SignedOut>
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/sign-in">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5"
                  >
                    Sign In
                  </Button>
                </Link>
                <Link href="/sign-up">
                  <Button 
                    // variant="ghost" 
                    size="sm" 
                    className="text-sm sm:text-base px-4 sm:px-6 py-2 sm:py-2.5 h-10 sm:h-11"
                  >
                    Sign Up
                  </Button>
                </Link>
              </div>
            </SignedOut>
            <SignedIn>
              <UserButton 
                appearance={{
                  elements: {
                    avatarBox: "h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12",
                    userButtonPopoverCard: "shadow-lg border",
                    userButtonPopoverActionButton: "hover:bg-muted",
                    userButtonPopoverActionButtonText: "text-sm sm:text-base"
                  }
                }}
              />
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
} 