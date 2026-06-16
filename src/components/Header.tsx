"use client";

import { SignedIn, SignedOut, UserButton, useUser } from "@clerk/nextjs";
import { Button } from "@/components/ui/button";
import { Container } from "@/components/ui/container";
import { CtaButton } from "@/components/ui/cta-button";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ShieldIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const LOGO_SRC = "/images/logos/fore-genomics-logo-green.svg";

const NAV_LINKS = [
  { label: "Why Fore", href: "/#why", id: "why" },
  { label: "How it works", href: "/#how-it-works", id: "how-it-works" },
  { label: "Contact", href: "/#contact", id: "contact" },
];
const SECTION_IDS = NAV_LINKS.map((link) => link.id);

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
        const next = SECTION_IDS.find((id) => visibleRef.current[id]) ?? null;
        setActiveId(next);
      },
      { rootMargin: "-45% 0px -45% 0px", threshold: 0 }
    );
    sections.forEach((section) => observer.observe(section));
    return () => observer.disconnect();
  }, [isHome]);

  const overlay = isHome;
  const onDark = overlay && !scrolled;

  return (
    <header className={cn("header-root", overlay ? "fixed" : "sticky")}>
      {/* Background bar — fades via opacity only so there's no lingering
          blur ghost when scrolling back to the top. */}
      <div
        aria-hidden="true"
        className={cn(
          "header-bar",
          overlay && !scrolled ? "opacity-0" : "opacity-100"
        )}
      />

      <Container className="relative">
        <div className="header-inner">
          {/* Logo */}
          <Link href="/" className="flex shrink-0 items-center">
            <Image
              src={LOGO_SRC}
              alt="Fore Genomics"
              width={160}
              height={40}
              priority
              className={cn(
                "h-6 w-auto transition-[filter] duration-200 sm:h-7",
                onDark && "logo-on-photo"
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
                      "nav-link",
                      onDark
                        ? cn(
                            "nav-link--on-photo",
                            active && "nav-link--active-on-photo"
                          )
                        : active
                          ? "nav-link--active-on-surface"
                          : "nav-link--on-surface"
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
              <CtaButton href="/sign-in" label="Sign in" variant="compact" />
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
      </Container>
    </header>
  );
}
