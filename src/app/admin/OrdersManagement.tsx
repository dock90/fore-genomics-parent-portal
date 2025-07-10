'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { updateOrderStatus, deleteOrder } from './_actions'
import { PackageIcon, CalendarIcon, ClockIcon, CheckCircleIcon } from 'lucide-react'
import { format } from 'date-fns'
import { useRouter } from 'next/navigation'

interface Order {
  id: string
  orderNumber: string
  status: string
  statusUpdatedAt: Date
  estimatedDelivery?: Date | null
  trackingNumber?: string | null
  notes?: string | null
  user: {
    email: string
    profile?: {
      firstName: string
      lastName: string
    } | null
  }
}

interface OrdersManagementProps {
  orders: Order[]
}

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'ONBOARDING_COMPLETED':
      return 'secondary'
    case 'PREPARING_ORDER':
      return 'default'
    case 'SHIPPED_TO_USER':
      return 'outline'
    case 'DELIVERED_AWAITING_RETURN':
      return 'outline'
    case 'SHIPPED_TO_LAB':
      return 'outline'
    case 'RECEIVED_IN_PROCESS':
      return 'default'
    case 'COMPLETE_REPORT_DELIVERED':
      return 'default'
    default:
      return 'secondary'
  }
}

function getStatusIcon(status: string) {
  switch (status) {
    case 'ONBOARDING_COMPLETED':
      return <CheckCircleIcon className="h-4 w-4" />
    case 'PREPARING_ORDER':
      return <PackageIcon className="h-4 w-4" />
    case 'SHIPPED_TO_USER':
      return <PackageIcon className="h-4 w-4" />
    case 'DELIVERED_AWAITING_RETURN':
      return <ClockIcon className="h-4 w-4" />
    case 'SHIPPED_TO_LAB':
      return <PackageIcon className="h-4 w-4" />
    case 'RECEIVED_IN_PROCESS':
      return <ClockIcon className="h-4 w-4" />
    case 'COMPLETE_REPORT_DELIVERED':
      return <CheckCircleIcon className="h-4 w-4" />
    default:
      return <PackageIcon className="h-4 w-4" />
  }
}

export function OrdersManagement({ orders }: OrdersManagementProps) {
  const router = useRouter()
  const orderStatuses = [
    'ONBOARDING_COMPLETED',
    'PREPARING_ORDER',
    'SHIPPED_TO_USER',
    'DELIVERED_AWAITING_RETURN',
    'SHIPPED_TO_LAB',
    'RECEIVED_IN_PROCESS',
    'COMPLETE_REPORT_DELIVERED'
  ]

  const handleUpdateOrder = async (formData: FormData) => {
    await updateOrderStatus(formData)
    router.refresh()
  }

  const handleDeleteOrder = async (formData: FormData) => {
    await deleteOrder(formData)
    router.refresh()
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <PackageIcon className="h-5 w-5" />
          Order Management
        </CardTitle>
        <CardDescription>
          Manage order statuses and track progress
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {orders.length === 0 ? (
            <div className="text-center py-8">
              <PackageIcon className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No orders found</h3>
              <p className="text-muted-foreground">
                No orders have been created yet.
              </p>
            </div>
          ) : (
            orders.map((order) => (
              <div key={order.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-foreground">
                        Order #{order.orderNumber}
                      </h3>
                      <Badge variant={getStatusBadgeVariant(order.status)}>
                        {getStatusIcon(order.status)}
                        {order.status.replace(/_/g, ' ')}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      <p>Customer: {order.user.profile?.firstName} {order.user.profile?.lastName} ({order.user.email})</p>
                      <p>Last Updated: {format(new Date(order.statusUpdatedAt), 'MMM dd, yyyy HH:mm')}</p>
                      {order.estimatedDelivery && (
                        <p>Estimated Delivery: {format(new Date(order.estimatedDelivery), 'MMM dd, yyyy')}</p>
                      )}
                      {order.trackingNumber && (
                        <p>Tracking: {order.trackingNumber}</p>
                      )}
                    </div>
                  </div>
                </div>

                <form action={handleUpdateOrder} className="space-y-3">
                  <input type="hidden" name="orderId" value={order.id} />
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div>
                      <label className="text-sm font-medium">Status</label>
                      <Select name="status" defaultValue={order.status}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {orderStatuses.map((status) => (
                            <SelectItem key={status} value={status}>
                              {status.replace(/_/g, ' ')}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <label className="text-sm font-medium">Notes</label>
                      <Textarea 
                        name="notes" 
                        placeholder="Add notes about this order..."
                        defaultValue={order.notes || ''}
                        className="min-h-[80px]"
                      />
                    </div>
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" size="sm">
                      Update Order
                    </Button>
                    
                    <form action={handleDeleteOrder}>
                      <input type="hidden" name="orderId" value={order.id} />
                      <Button 
                        type="submit" 
                        size="sm" 
                        variant="destructive"
                        className="text-white"
                      >
                        Delete Order
                      </Button>
                    </form>
                  </div>
                </form>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
} 