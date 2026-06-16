"use client";

import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ShieldIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "@/components/auth/icons";

const NAV_LINKS = [
  { label: "Why Fore", href: "/#why", id: "why" },
  { label: "How it works", href: "/#how-it-works", id: "how-it-works" },
  { label: "Contact", href: "/#contact", id: "contact" },
];
const SECTION_IDS = NAV_LINKS.map((l) => l.id);

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

  // Scroll-spy: highlight the nav link for the section currently in view.
  const [activeId, setActiveId] = useState<string | null>(null);
  const visibleRef = useRef<Record<string, boolean>>({});
  useEffect(() => {
    if (!isHome) {
      setActiveId(null);
      return;
    }
    const sections = SECTION_IDS.map((id) => document.getElementById(id)).filter(
      (el): el is HTMLElement => el !== null
    );
    if (sections.length === 0) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          visibleRef.current[entry.target.id] = entry.isIntersecting;
        });
        // First section (in document order) crossing the band wins.
        const next = SECTION_IDS.find((id) => visibleRef.current[id]) ?? null;
        setActiveId(next);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    sections.forEach((s) => observer.observe(s));
    return () => observer.disconnect();
  }, [isHome]);

  const overlay = isHome;
  const onDark = overlay && !scrolled;

  return (
    <header
      className={cn(
        "inset-x-0 top-0 z-50 w-full",
        overlay ? "fixed" : "sticky"
      )}
    >
      {/* Background bar — fades in/out via opacity only so there's no
          lingering blur ghost when scrolling back to the top. */}
      <div
        aria-hidden
        className={cn(
          "absolute inset-0 bg-background/80 backdrop-blur transition-opacity duration-200 ease-out supports-[backdrop-filter]:bg-background/65",
          overlay && !scrolled ? "opacity-0" : "opacity-100"
        )}
      />

      <div className="relative mx-auto max-w-[1600px] px-5 sm:px-8 lg:px-12">
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
                "h-6 w-auto transition-[filter] duration-200 sm:h-7",
                onDark &&
                  "brightness-0 invert drop-shadow-[0_1px_4px_rgba(16,32,28,0.5)]"
              )}
            />
          </Link>

          {/* Editorial nav (home only) */}
          {isHome && (
            <nav className="hidden items-center gap-8 md:flex lg:gap-10">
              {NAV_LINKS.map((link) => {
                const active = activeId === link.id;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={active ? "true" : undefined}
                    className={cn(
                      "text-base font-semibold tracking-tight underline-offset-8 transition-colors duration-200",
                      onDark
                        ? "text-white [text-shadow:0_1px_2px_rgba(16,32,28,0.95),0_2px_12px_rgba(16,32,28,0.5)]"
                        : active
                          ? "text-primary"
                          : "text-foreground/80 hover:text-primary",
                      onDark && !active && "hover:text-white/80",
                      active && "underline decoration-2",
                      active &&
                        (onDark ? "decoration-white/80" : "decoration-primary")
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>
          )}

          {/* Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <SignedOut>
              <Link
                href="/sign-in"
                className="inline-flex h-12 items-center gap-2 rounded-full px-7 text-base font-semibold text-white shadow-md transition-all duration-200 hover:-translate-y-px hover:brightness-105"
                style={{
                  background: "linear-gradient(135deg,#68b3a9 0%,#5e9e8f 70%)",
                  boxShadow: "0 12px 26px -10px rgba(80,145,127,.6)",
                }}
              >
                Sign in
                <ArrowRight size={18} />
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
