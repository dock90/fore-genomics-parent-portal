"use client";

import {
  SignedIn,
  SignedOut,
  SignInButton,
  UserButton,
  useUser,
} from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { ShieldIcon } from "lucide-react";

export function Header() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 safe-top">
      <div className="container-mobile container-tablet container-desktop">
        <div className="flex h-16 sm:h-18 items-center justify-between gap-3 sm:gap-4">
          {/* Logo */}
          <div className="flex items-center h-full px-2">
            <img
              src="/images/logos/fore_genomics_logo.png"
              alt="Fore Genomics Logo"
              className="h-8 max-h-10 w-auto max-w-[120px] sm:h-12 sm:max-w-[160px] md:h-16 md:max-w-[200px] lg:h-20 lg:max-w-[240px]"
              style={{ objectFit: "contain", minWidth: 0 }}
            />
          </div>

          {/* Navigation/Actions */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <SignedOut>
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/sign-in">
                  <Button
                    size="sm"
                    className="text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5"
                  >
                    Sign In
                  </Button>
                </Link>
              </div>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-2 sm:gap-3">
                {isAdmin && (
                  <Link href="/admin">
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-sm sm:text-base px-3 sm:px-4 py-2 sm:py-2.5 flex items-center gap-1"
                    >
                      <ShieldIcon className="h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-10 w-10 sm:h-11 sm:w-11 lg:h-12 lg:w-12",
                      userButtonPopoverCard: "shadow-lg border",
                      userButtonPopoverActionButton: "hover:bg-muted",
                      userButtonPopoverActionButtonText: "text-sm sm:text-base",
                    },
                  }}
                />
              </div>
            </SignedIn>
          </div>
        </div>
      </div>
    </header>
  );
}
