"use client";

import { SignedIn, SignedOut, SignInButton, SignUpButton, UserButton } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="flex justify-between items-center p-4 gap-4 h-16 border-b">
      <div className="flex items-center h-full">
        <img
          src="/images/logos/fore_genomics_logo.png"
          alt="Fore Genomics Logo"
          className="h-10 w-auto"
        />
      </div>
      <div className="flex items-center gap-4">
        <SignedOut>
          <SignInButton />
          <SignUpButton>
            <Button>Sign Up</Button>
          </SignUpButton>
        </SignedOut>
        <SignedIn>
          <UserButton />
        </SignedIn>
      </div>
    </header>
  );
} 