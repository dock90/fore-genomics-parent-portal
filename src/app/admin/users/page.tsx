import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'
import { SearchUsers } from '../SearchUsers'
import { UserDataManagement } from '../UserDataManagement'
import { InviteAdminModal } from '../InviteAdminModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { UsersIcon } from 'lucide-react'

export default async function UsersPage() {
  // Fetch all users with their profiles, consents, and orders
  const usersWithData = await prisma.user.findMany({
    include: {
      profile: true,
      consents: true,
      parentOrders: true,
      purchaserOrders: true,
      children: true,
      questionnaires: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
        <p className="text-gray-600 mt-2">Search, manage, and view user data</p>
      </div>

      {/* Admin Invitation */}
      <div className="flex justify-end">
        <InviteAdminModal />
      </div>

      {/* Search Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UsersIcon className="h-5 w-5" />
            Search Users
          </CardTitle>
          <CardDescription>
            Search for users and manage their roles
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SearchUsers />
        </CardContent>
      </Card>

      {/* User Data Management */}
      <UserDataManagement users={usersWithData} />
    </div>
  )
} 