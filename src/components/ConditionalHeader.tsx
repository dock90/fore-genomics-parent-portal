"use client";

import { usePathname } from "next/navigation";
import { Header } from "./Header";

export function ConditionalHeader() {
  const pathname = usePathname();

  // Hide header on admin and counselor pages
  if (pathname.startsWith("/admin") || pathname.startsWith("/counselor")) {
    return null;
  }

  return <Header />;
}
