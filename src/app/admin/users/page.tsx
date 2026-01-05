import { prisma } from "@/lib/prisma";
import { SearchUsers } from "../SearchUsers";
import { UserDataManagement } from "../UserDataManagement";
import { InviteAdminModal } from "../InviteAdminModal";
import { InviteCounselorModal } from "../InviteCounselorModal";

export default async function UsersPage() {
  // Fetch all users with their profiles, consents, and orders
  const usersWithData = await prisma.user.findMany({
    include: {
      profile: true,
      consents: true,
      parentOrders: true,
      purchaserOrders: true,
      children: true,
      questionnaires: true,
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-foreground">Users</h1>
          <p className="text-muted-foreground mt-1">
            Search, manage, and view user data
          </p>
        </div>
        <div className="flex gap-2">
          <InviteCounselorModal />
          <InviteAdminModal />
        </div>
      </div>

      {/* Search Section */}
      <div className="space-y-3">
        <h2 className="text-sm font-medium text-foreground">Search Users</h2>
        <SearchUsers />
      </div>

      {/* User Data Management */}
      <UserDataManagement users={usersWithData} />
    </div>
  );
}
