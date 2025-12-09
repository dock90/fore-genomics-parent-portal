"use client";

import { UserButton } from "@clerk/nextjs";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, Home, LogOut, Mail } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/DashboardSidebar";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

interface DashboardLayoutProps {
  children: React.ReactNode;
}

export function DashboardLayout({ children }: DashboardLayoutProps) {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const supportEmail =
    process.env.NODE_ENV === "production"
      ? "parent.portal@foregenomics.com"
      : "parent.portal-dev@foregenomics.com";

  return (
    <SidebarProvider>
      <DashboardSidebar />
      <SidebarInset>
        {/* Mobile Header */}
        <header className="flex md:hidden h-14 items-center justify-between border-b px-4 bg-background">
          <Link href="/dashboard" className="flex items-center">
            <img
              src="/images/logos/fore_genomics_logo.png"
              alt="Fore Genomics Logo"
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
              <SheetContent side="right" className="w-[90%] sm:max-w-[90%] flex flex-col">
                <SheetHeader>
                  <SheetTitle className="sr-only">Navigation Menu</SheetTitle>
                </SheetHeader>
                <nav className="flex flex-col flex-1 pt-8">
                  <div className="flex-1">
                    <Link
                      href="/dashboard"
                      className={`flex items-center gap-3 rounded-lg px-3 py-3 transition-colors ${
                        pathname === "/dashboard"
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                      }`}
                    >
                      <Home className="h-5 w-5" />
                      <span className="text-base">Dashboard</span>
                    </Link>
                  </div>
                  <div className="border-t pt-4 space-y-2">
                    <Button asChild variant="outline" className="w-full justify-start h-11">
                      <a href={`mailto:${supportEmail}`}>
                        <Mail className="mr-2 h-5 w-5" />
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

        {/* Desktop Header */}
        <header className="hidden md:flex h-14 items-center justify-between border-b px-6 bg-background">
          <SidebarTrigger className="-ml-2" />
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

        {/* Main Content */}
        <div className="flex-1 overflow-auto bg-muted/30">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
}

