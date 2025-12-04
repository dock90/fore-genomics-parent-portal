import { redirect } from "next/navigation";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { prisma } from "@/lib/prisma";
import { checkRole } from "@/utils/roles";
import { CounselorNavigation } from "./CounselorNavigation";
import { AdminHeader } from "@/components/AdminHeader";

export default async function CounselorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  if (!checkRole("COUNSELOR")) {
    redirect("/");
  }

  // Ensure counselor user exists in database
  try {
    const { userId } = await auth();
    if (userId) {
      const client = await clerkClient();
      const clerkUser = await client.users.getUser(userId);
      const userEmail = clerkUser.emailAddresses[0]?.emailAddress;

      if (userEmail) {
        // Check if user exists in database
        const existingUser = await prisma.user.findUnique({
          where: { email: userEmail },
        });

        if (!existingUser) {
          // Create counselor user in database
          await prisma.user.create({
            data: {
              email: userEmail,
              role: "COUNSELOR",
            },
          });
        } else if (existingUser.role !== "COUNSELOR") {
          // Update user role if it's different
          await prisma.user.update({
            where: { id: existingUser.id },
            data: { role: "COUNSELOR" },
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
        <CounselorNavigation />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col">
          {/* Counselor Header */}
          <AdminHeader />

          {/* Page Content */}
          <main className="flex-1 p-6">{children}</main>
        </div>
      </div>
    </div>
  );
}
