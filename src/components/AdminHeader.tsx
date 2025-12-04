"use client";

import { UserButton } from "@clerk/nextjs";

export function AdminHeader() {
  return (
    <header className="sticky top-0 z-40 w-full border-b bg-white shadow-sm">
      <div className="flex h-16 items-center justify-end px-6">
        {/* User menu */}
        <UserButton
          appearance={{
            elements: {
              avatarBox: "h-8 w-8",
              userButtonPopoverCard: "shadow-lg border",
              userButtonPopoverActionButton: "hover:bg-muted",
              userButtonPopoverActionButtonText: "text-sm",
            },
          }}
        />
      </div>
    </header>
  );
}
