"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";

export function ConditionalHeader() {
  const pathname = usePathname();

  // Hide header on admin, counselor, dashboard, sign-in, and forgot-password pages
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/counselor") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/sign-in") ||
    pathname.startsWith("/forgot-password")
  ) {
    return null;
  }

  return <Header />;
}
