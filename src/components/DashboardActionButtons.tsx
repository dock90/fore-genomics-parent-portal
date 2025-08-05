"use client";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { LogOut, Trash2 } from "lucide-react";
import { useClerk } from "@clerk/nextjs";
import { useState } from "react";

export default function DashboardActionButtons() {
  const { signOut } = useClerk();
  const [isResetting, setIsResetting] = useState(false);

  const handleReset = async () => {
    if (
      !confirm(
        "Are you sure you want to delete all your data? This action cannot be undone."
      )
    ) {
      return;
    }

    setIsResetting(true);
    try {
      const response = await fetch("/api/user/reset", {
        method: "DELETE",
        credentials: "include",
      });

      if (response.ok) {
        await signOut();
      } else {
        const errorData = await response.json();
        console.error("Reset failed:", errorData);
        alert(`Failed to reset: ${errorData.error || "Unknown error"}`);
        setIsResetting(false);
      }
    } catch (error) {
      console.error("Error resetting user data:", error);
      alert("Error resetting user data");
      setIsResetting(false);
    }
  };

  return (
    <>
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

      {/* Testing Reset Button - Only show in staging */}
      {process.env.NEXT_PUBLIC_TEST_MODE === "true" && (
        <Card className="w-full mt-6 border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950/20">
          <CardHeader className="pb-3 sm:pb-4">
            <CardTitle className="text-lg sm:text-xl flex items-center gap-2 text-red-700 dark:text-red-300">
              <Trash2 className="h-5 w-5" />
              Testing - Reset User Data
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-red-600 dark:text-red-400 mb-4">
              This will permanently delete all your data, including your Clerk
              account, and log you out.
            </p>
            <Button
              onClick={handleReset}
              disabled={isResetting}
              variant="destructive"
              className="w-full"
            >
              {isResetting ? "Deleting..." : "Delete All Data & Sign Out"}
            </Button>
          </CardContent>
        </Card>
      )}
    </>
  );
}
