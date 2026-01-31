"use client";

import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { ShieldIcon } from "lucide-react";

export function Header() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "ADMIN";

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="flex h-14 sm:h-16 items-center justify-between gap-3 sm:gap-4">
          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/images/logos/fore_genomics_logo.png"
              alt="Fore Genomics Logo"
              width={160}
              height={40}
              className="h-6 w-auto sm:h-7"
              priority
            />
          </Link>

          {/* Navigation/Actions */}
          <div className="flex items-center gap-2 sm:gap-3 lg:gap-4">
            <SignedOut>
              <div className="flex items-center gap-2 sm:gap-3">
                <Link href="/sign-in">
                  <Button className="text-sm sm:text-base px-5 sm:px-6 py-2.5">
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
