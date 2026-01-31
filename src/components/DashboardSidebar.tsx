"use client";

import { useClerk } from "@clerk/nextjs";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Home, LogOut, Mail, HelpCircle } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarSeparator,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
];

export function DashboardSidebar() {
  const pathname = usePathname();
  const { signOut } = useClerk();

  const supportEmail =
    process.env.NODE_ENV === "production"
      ? "parent.portal@foregenomics.com"
      : "parent.portal-dev@foregenomics.com";

  return (
    <Sidebar>
      <SidebarHeader className="p-4 pb-2">
        <Link href="/dashboard" className="flex items-center">
          <Image
            src="/images/logos/fore_genomics_logo.png"
            alt="Fore Genomics Logo"
            width={160}
            height={48}
            className="h-10 w-auto"
          />
        </Link>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navigation</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton
                    asChild
                    isActive={pathname === item.href}
                    tooltip={item.title}
                  >
                    <Link href={item.href}>
                      <item.icon className="h-4 w-4" />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="p-4 space-y-2">
        <SidebarSeparator className="mb-2" />
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
      </SidebarFooter>
    </Sidebar>
  );
}

