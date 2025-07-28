import { prisma } from '@/lib/prisma'
import { OrdersManagement } from '../OrdersManagement'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { PackageIcon } from 'lucide-react'
import { CreateOrderModal } from './CreateOrderModal'

export default async function OrdersPage() {
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

  // Fetch all users for the modal
  const users = await prisma.user.findMany({
    include: {
      profile: true
    },
    orderBy: {
      email: 'asc'
    }
  })

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Order Management</h1>
          <p className="text-gray-600 mt-2">Manage orders, update status, and upload reports</p>
        </div>
        <CreateOrderModal users={users} />
      </div>

      {/* Orders Management */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageIcon className="h-5 w-5" />
            Orders
          </CardTitle>
          <CardDescription>
            View and manage all orders in the system
          </CardDescription>
        </CardHeader>
        <CardContent>
          <OrdersManagement orders={orders} />
        </CardContent>
      </Card>
    </div>
  )
} 