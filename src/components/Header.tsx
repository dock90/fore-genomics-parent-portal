"use client";

import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ShieldIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "@/components/auth/icons";

const NAV_LINKS = [
  { label: "Why Fore", href: "/#why" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "Contact", href: "/#contact" },
];

export function Header() {
  const { user } = useUser();
  const isAdmin = user?.publicMetadata?.role === "ADMIN";
  const pathname = usePathname();
  const isHome = pathname === "/";

  // On the home page the header floats over the full-bleed hero and only
  // solidifies once the user scrolls past the fold.
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    if (!isHome) {
      setScrolled(false);
      return;
    }
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  const overlay = isHome;
  const onDark = overlay && !scrolled;

  return (
    <header
      className={cn(
        "inset-x-0 top-0 z-50 w-full transition-all duration-300",
        overlay ? "fixed" : "sticky",
        onDark
          ? "bg-transparent"
          : "border-b border-fore-teal/15 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/65"
      )}
    >
      <div className="mx-auto max-w-[1400px] px-5 sm:px-8 lg:px-12">
        <div className="flex h-16 items-center justify-between gap-4 sm:h-20">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src="/images/logos/fore-genomics-logo-green.svg"
              alt="Fore Genomics"
              width={160}
              height={40}
              priority
              className={cn(
                "h-6 w-auto transition-[filter] duration-300 sm:h-7",
                onDark && "brightness-0 invert"
              )}
            />
          </Link>

          {/* Editorial nav (home only) */}
          {isHome && (
            <nav className="hidden items-center gap-8 md:flex lg:gap-10">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "text-sm font-medium tracking-tight transition-colors",
                    onDark
                      ? "text-white/80 hover:text-white"
                      : "text-foreground/70 hover:text-primary"
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SignedOut>
              <Link
                href="/sign-in"
                className="inline-flex h-11 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-px hover:brightness-105"
                style={{
                  background: "linear-gradient(135deg,#68b3a9 0%,#5e9e8f 70%)",
                  boxShadow: "0 12px 26px -10px rgba(80,145,127,.6)",
                }}
              >
                Sign in
                <ArrowRight size={16} />
              </Link>
            </SignedOut>
            <SignedIn>
              <div className="flex items-center gap-2 sm:gap-3">
                {isAdmin && (
                  <Link href="/admin">
                    <Button
                      variant="outline"
                      size="sm"
                      className="flex items-center gap-1 text-sm sm:text-base"
                    >
                      <ShieldIcon className="h-4 w-4" />
                      Admin
                    </Button>
                  </Link>
                )}
                <UserButton
                  appearance={{
                    elements: {
                      avatarBox: "h-10 w-10 sm:h-11 sm:w-11",
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
