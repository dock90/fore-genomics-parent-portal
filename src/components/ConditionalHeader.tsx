"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";

export function ConditionalHeader() {
  const pathname = usePathname();

  // Hide header on admin, counselor, and dashboard pages (dashboard has its own sidebar layout)
  if (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/counselor") ||
    pathname.startsWith("/dashboard")
  ) {
    return null;
  }

  return <Header />;
}
