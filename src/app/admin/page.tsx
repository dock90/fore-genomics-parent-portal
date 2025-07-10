import { redirect } from 'next/navigation'
import { checkRole } from '@/utils/roles'
import { SearchUsers } from './SearchUsers'
import { OrdersManagement } from './OrdersManagement'
import { clerkClient } from '@clerk/nextjs/server'
import { removeRole, setRole, deleteUser, deleteUserProfile, deleteConsent } from './_actions'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { UserIcon, MailIcon, ShieldIcon, UsersIcon } from 'lucide-react'
import { ConfirmDialog } from '@/components/ui/confirm-dialog'
import { UserDataManagement } from './UserDataManagement'
import type { UserRole } from '../../../types/globals'
import { prisma } from '@/lib/prisma'

function getBadgeVariant(role: UserRole): 'destructive' | 'secondary' {
  return role === 'ADMIN' ? 'destructive' : 'secondary'
}

function renderRoleBadge(role: unknown) {
  if (role && typeof role === 'string') {
    return (
      <Badge variant={getBadgeVariant(role as UserRole)}>
        {role}
      </Badge>
    )
  }
  return null
}

export default async function AdminDashboard(params: {
  searchParams: Promise<{ search?: string }>
}) {
  if (!checkRole('ADMIN')) {
    redirect('/')
  }

  const query = (await params.searchParams).search

  const client = await clerkClient()

  const users = query ? (await client.users.getUserList({ query })).data : []

  // Fetch all orders with user information
  const orders = await prisma.order.findMany({
    include: {
      user: {
        include: {
          profile: true
        }
      }
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  // Fetch all users with their profiles, consents, and orders
  const usersWithData = await prisma.user.findMany({
    include: {
      profile: true,
      consents: true,
      orders: true,
      children: true,
      questionnaires: true
    },
    orderBy: {
      createdAt: 'desc'
    }
  })

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <ShieldIcon className="h-8 w-8 text-blue-600" />
            <h1 className="text-3xl font-bold text-foreground">Admin Dashboard</h1>
          </div>
        </div>

        {/* Search Section */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UsersIcon className="h-5 w-5" />
              User Management
            </CardTitle>
            <CardDescription>
              Search for users and manage their roles
            </CardDescription>
          </CardHeader>
          <CardContent>
            <SearchUsers />
          </CardContent>
        </Card>

        {/* Users List */}
        {users.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Search Results</CardTitle>
              <CardDescription>
                Found {users.length} user{users.length !== 1 ? 's' : ''}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4 hover:bg-muted/50 transition-colors">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                          <UserIcon className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground">
                              {user.firstName} {user.lastName}
                            </h3>
                            {renderRoleBadge(user.publicMetadata.role)}
                          </div>
                          <div className="flex items-center gap-1 text-sm text-muted-foreground">
                            <MailIcon className="h-3 w-3" />
                            {user.emailAddresses.find((email) => email.id === user.primaryEmailAddressId)?.emailAddress}
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-2">
                        <form action={setRole}>
                          <input type="hidden" value={user.id} name="id" />
                          <input type="hidden" value="ADMIN" name="role" />
                          <Button 
                            type="submit" 
                            size="sm" 
                            variant="outline"
                            className="text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Make Admin
                          </Button>
                        </form>

                        <form action={setRole}>
                          <input type="hidden" value={user.id} name="id" />
                          <input type="hidden" value="COUNSELOR" name="role" />
                          <Button 
                            type="submit" 
                            size="sm" 
                            variant="outline"
                            className="text-blue-600 border-blue-200 hover:bg-blue-50"
                          >
                            Make Counselor
                          </Button>
                        </form>

                        <form action={removeRole}>
                          <input type="hidden" value={user.id} name="id" />
                          <Button 
                            type="submit" 
                            size="sm" 
                            variant="outline"
                            className="text-gray-600 border-gray-200 hover:bg-gray-50"
                          >
                            Remove Role
                          </Button>
                        </form>

                        <form action={deleteUser}>
                          <input type="hidden" value={user.id} name="userId" />
                          <Button 
                            type="submit" 
                            size="sm" 
                            variant="destructive"
                            className="text-white"
                          >
                            Delete User
                          </Button>
                        </form>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {query && users.length === 0 && (
          <Card>
            <CardContent className="py-12">
              <div className="text-center">
                <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">No users found</h3>
                <p className="text-muted-foreground">
                  No users match your search criteria. Try a different search term.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Instructions */}
        {!query && (
          <Card>
            <CardContent className="py-8">
              <div className="text-center">
                <UsersIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">Search for users</h3>
                <p className="text-muted-foreground">
                  Use the search form above to find users and manage their roles.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* User Data Management */}
        <UserDataManagement users={usersWithData} />

        {/* Orders Management */}
        <div className="mt-8">
          <OrdersManagement orders={orders} />
        </div>
      </div>
    </div>
  )
} 