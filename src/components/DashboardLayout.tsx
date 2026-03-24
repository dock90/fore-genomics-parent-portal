"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Menu, Home, LogOut, HelpCircle } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
];

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const supportEmail =
    process.env.NODE_ENV === "production"
      ? "parent.portal@foregenomics.com"
      : "parent.portal-dev@foregenomics.com";

  return (
    <div className="h-screen bg-background overflow-hidden">
      {/* Desktop Sidebar - Fixed */}
      <div className="hidden md:flex fixed inset-y-0 left-0 w-64 bg-background border-r border-border flex-col z-30">
        {/* Logo */}
        <div className="p-4 border-b border-border">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/images/logos/fore-genomics-logo-green.svg"
              alt="Fore Genomics Logo"
            width={100}
            height={28}
            className="h-6 w-auto"
            />
          </Link>
        </div>

        {/* Navigation */}
        <nav className="flex-1 p-4 overflow-y-auto">
          <p className="text-xs font-medium text-muted-foreground mb-2 px-3">
            Navigation
          </p>
          <ul className="space-y-1">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              return (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
                      isActive
                        ? "bg-accent text-accent-foreground"
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.title}
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-border space-y-2">
          <Button asChild variant="outline" className="w-full justify-start h-10" size="sm">
            <a href={`mailto:${supportEmail}`}>
              <HelpCircle className="mr-2 h-4 w-4" />
              Contact Support
            </a>
          </Button>
          <Button
            onClick={() => signOut()}
            variant="ghost"
            className="w-full justify-start h-10 text-muted-foreground hover:text-foreground"
            size="sm"
          >
            <LogOut className="mr-2 h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </div>

      {/* Main Content Area - Offset for sidebar on desktop */}
      <div className="flex flex-col h-screen md:ml-64">
        {/* Mobile Header */}
        <header className="flex md:hidden h-14 items-center justify-between border-b px-4 bg-background shrink-0">
          <Link href="/dashboard" className="flex items-center">
            <Image
              src="/images/logos/fore-genomics-logo-green.svg"
              alt="Fore Genomics Logo"
              width={120}
              height={32}
              className="h-8 w-auto"
              style={{ objectFit: "contain" }}
            />
          </Link>

          <div className="flex items-center gap-2">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "h-7 w-7",
                  userButtonPopoverCard: "shadow-lg border",
                  userButtonPopoverActionButton: "hover:bg-muted",
                },
              }}
            />
            <Sheet>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                  <span className="sr-only">Toggle menu</span>
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] flex flex-col">
                <SheetHeader>
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col flex-1 pt-8">
                  <div className="flex-1">
                    {navItems.map((item) => {
                      const isActive = pathname === item.href;
                      return (
                        <Link
                          key={item.title}
                          href={item.href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-3 transition-colors",
                            isActive
                              ? "bg-accent text-accent-foreground"
                              : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          <span className="text-base">{item.title}</span>
                        </Link>
                      );
                    })}
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <Button asChild variant="outline" className="w-full justify-start h-11">
                      <a href={`mailto:${supportEmail}`}>
                        <HelpCircle className="mr-2 h-5 w-5" />
                        Contact Support
                      </a>
                    </Button>
                    <Button
                      onClick={() => signOut()}
                      variant="ghost"
                      className="w-full justify-start h-11"
                    >
                      <LogOut className="mr-2 h-5 w-5" />
                      Sign Out
                    </Button>
                  </div>
                </nav>
              </SheetContent>
            </Sheet>
          </div>
        </header>

        {/* Desktop Header - Fixed at top */}
        <header className="hidden md:flex h-14 items-center justify-end border-b px-6 bg-background shrink-0">
          <UserButton
            appearance={{
              elements: {
                avatarBox: "h-9 w-9",
                userButtonPopoverCard: "shadow-lg border",
                userButtonPopoverActionButton: "hover:bg-muted",
              },
            }}
          />
        </header>

        {/* Main Content - Scrollable */}
        <main className="flex-1 overflow-y-auto bg-muted/30">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
