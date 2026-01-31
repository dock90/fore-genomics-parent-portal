import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";
import { AdminNavigation } from "./AdminNavigation";
import { AdminHeader } from "@/components/AdminHeader";
import { getDbUser } from "@/lib/user-service";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!checkRole("ADMIN")) {
    redirect("/");
  }

  // Ensure admin user exists in database
  try {
    const { userId } = await auth();
    if (userId) {
      // Get database user (this handles clerkId linking automatically)
      const existingUser = await getDbUser(userId);

      if (!existingUser) {
        // Get email from Clerk for creating new user
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(userId);
        const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

        if (userEmail) {
          // Create admin user in database
          await prisma.user.create({
            data: {
              clerkId: userId,
              email: userEmail,
              role: "ADMIN",
            },
          });
        }
      }
    }
  } catch (error) {
    // Continue even if database creation fails
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        {/* Sidebar Navigation */}
        <AdminNavigation />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Admin Header */}
          <AdminHeader />

          {/* Page Content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
