"use client";

import { Button } from "@/components/ui/button";
import { LogOut } from "lucide-react";
import { useClerk } from "@clerk/nextjs";

export default function DashboardActionButtons() {
  const { signOut } = useClerk();

  return (
    <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center mt-8">
      <Button
        asChild
        variant="outline"
        className="w-full sm:w-auto"
      >
        <a
          href={`mailto:${
            process.env.NODE_ENV === "production"
              ? "parent.portal@foregenomics.com"
              : "parent.portal-dev@foregenomics.com"
          }`}
        >
          Contact Support
        </a>
      </Button>
      <Button onClick={() => signOut()} className="w-full sm:w-auto">
        <LogOut className="mr-2 h-4 w-4" />
        Sign Out
      </Button>
    </div>
  );
}
