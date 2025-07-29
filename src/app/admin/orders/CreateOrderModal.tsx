'use client'

import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { PlusIcon } from 'lucide-react'
import { createOrder } from './create/_actions'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'

interface User {
  id: string
  email: string
  profile?: {
    firstName: string
    lastName: string
  } | null
}

interface CreateOrderModalProps {
  users: User[]
}

type KitType = 'BASE' | 'PLUS' | 'PREMIUM'

const createOrderSchema = z.object({
  userType: z.enum(['existing', 'new']),
  userId: z.string().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  email: z.string().email().optional(),
  notes: z.string().optional(),
  kitCount: z.number().min(1).max(10),
  kitTypes: z.array(z.enum(['BASE', 'PLUS', 'PREMIUM'])),
}).refine((data) => {
  if (data.userType === 'existing') {
    return data.userId && data.userId.length > 0
  } else {
    return data.firstName && data.lastName && data.email
  }
}, {
  message: "Please fill in all required fields",
  path: ["userType"]
})

type CreateOrderFormData = z.infer<typeof createOrderSchema>

export function CreateOrderModal({ users }: CreateOrderModalProps) {
  const router = useRouter()
  const [isOpen, setIsOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [kitCount, setKitCount] = useState(1)
  const [kitTypes, setKitTypes] = useState<KitType[]>(['BASE'])

  const form = useForm<CreateOrderFormData>({
    resolver: zodResolver(createOrderSchema),
    defaultValues: {
      userType: 'existing',
      userId: '',
      firstName: '',
      lastName: '',
      email: '',
      notes: '',
      kitCount: 1,
      kitTypes: ['BASE'],
    },
    mode: 'onChange',
  })

  const userType = form.watch('userType')

  // Update kit types when kit count changes
  const handleKitCountChange = (newKitCount: number) => {
    setKitCount(newKitCount)
    form.setValue('kitCount', newKitCount)
    
    if (kitTypes.length < newKitCount) {
      // Add default BASE kits
      const newKitTypes = [...kitTypes, ...Array(newKitCount - kitTypes.length).fill('BASE')]
      setKitTypes(newKitTypes)
      form.setValue('kitTypes', newKitTypes)
    } else if (kitTypes.length > newKitCount) {
      // Remove excess kits
      const newKitTypes = kitTypes.slice(0, newKitCount)
      setKitTypes(newKitTypes)
      form.setValue('kitTypes', newKitTypes)
    }
  }

  const handleKitTypeChange = (index: number, kitType: KitType) => {
    const newKitTypes = [...kitTypes]
    newKitTypes[index] = kitType
    setKitTypes(newKitTypes)
    form.setValue('kitTypes', newKitTypes)
  }

  const onSubmit = async (data: CreateOrderFormData) => {
    setIsSubmitting(true)
    
    try {
      const formData = new FormData()
      formData.append('userType', data.userType)
      
      if (data.userType === 'existing') {
        formData.append('userId', data.userId!)
      } else {
        formData.append('firstName', data.firstName!)
        formData.append('lastName', data.lastName!)
        formData.append('email', data.email!)
      }
      
      formData.append('notes', data.notes || '')
      formData.append('kitCount', data.kitCount.toString())
      formData.append('kitTypes', JSON.stringify(data.kitTypes))
      
      await createOrder(formData)
      setIsOpen(false)
      form.reset()
      setKitCount(1)
      setKitTypes(['BASE'])
      router.refresh()
    } catch (error) {
      // Handle error silently or show a toast notification
      console.error('Error creating order:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleOpenChange = (open: boolean) => {
    setIsOpen(open)
    if (!open) {
      form.reset()
      setKitCount(1)
      setKitTypes(['BASE'])
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button className="flex items-center gap-2">
          <PlusIcon className="h-4 w-4" />
          Create Order
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Create New Order</DialogTitle>
          <DialogDescription>
            Create a new order for an existing user or create a new user account.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          <div className="space-y-4">
            {/* User Type Selection */}
            <div>
              <Label>User Type</Label>
              <RadioGroup 
                value={userType} 
                onValueChange={(value) => {
                  form.setValue('userType', value as 'existing' | 'new')
                  form.setValue('userId', '')
                  form.setValue('firstName', '')
                  form.setValue('lastName', '')
                  form.setValue('email', '')
                }}
                className="flex flex-col space-y-2"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="existing" id="existing" />
                  <Label htmlFor="existing">Existing User</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="new" id="new" />
                  <Label htmlFor="new">New User</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Existing User Selection */}
            {userType === 'existing' && (
              <div>
                <Label htmlFor="userId">Select User *</Label>
                <Select 
                  value={form.watch('userId')} 
                  onValueChange={(value) => form.setValue('userId', value)}
                >
                  <SelectTrigger className={form.formState.errors.userId ? 'border-red-500' : ''}>
                    <SelectValue placeholder="Choose a user..." />
                  </SelectTrigger>
                  <SelectContent>
                    {users.map((user) => (
                      <SelectItem key={user.id} value={user.id}>
                        {user.profile?.firstName} {user.profile?.lastName} ({user.email})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {form.formState.errors.userId && (
                  <p className="text-sm text-red-500 mt-1">
                    {form.formState.errors.userId.message}
                  </p>
                )}
              </div>
            )}

            {/* New User Fields */}
            {userType === 'new' && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="firstName">First Name *</Label>
                    <Input
                      id="firstName"
                      {...form.register('firstName')}
                      placeholder="Enter first name"
                      className={form.formState.errors.firstName ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.firstName && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.firstName.message}
                      </p>
                    )}
                  </div>
                  <div>
                    <Label htmlFor="lastName">Last Name *</Label>
                    <Input
                      id="lastName"
                      {...form.register('lastName')}
                      placeholder="Enter last name"
                      className={form.formState.errors.lastName ? 'border-red-500' : ''}
                    />
                    {form.formState.errors.lastName && (
                      <p className="text-sm text-red-500 mt-1">
                        {form.formState.errors.lastName.message}
                      </p>
                    )}
                  </div>
                </div>
                <div>
                  <Label htmlFor="email">Email Address *</Label>
                  <Input
                    id="email"
                    type="email"
                    {...form.register('email')}
                    placeholder="Enter email address"
                    className={form.formState.errors.email ? 'border-red-500' : ''}
                  />
                  {form.formState.errors.email && (
                    <p className="text-sm text-red-500 mt-1">
                      {form.formState.errors.email.message}
                    </p>
                  )}
                </div>
              </div>
            )}

            {/* Kit Configuration */}
            <div className="space-y-4">
              <div>
                <Label htmlFor="kitCount">Number of Test Kits *</Label>
                <Select 
                  value={kitCount.toString()} 
                  onValueChange={(value) => handleKitCountChange(parseInt(value))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                      <SelectItem key={num} value={num.toString()}>
                        {num} {num === 1 ? 'Kit' : 'Kits'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Kit Type Selection */}
              <div className="space-y-3">
                <Label>Kit Types</Label>
                {Array.from({ length: kitCount }, (_, index) => (
                  <div key={index} className="flex items-center gap-3">
                    <span className="text-sm font-medium w-8">#{index + 1}</span>
                    <Select 
                      value={kitTypes[index] || 'BASE'} 
                      onValueChange={(value) => handleKitTypeChange(index, value as KitType)}
                    >
                      <SelectTrigger className="flex-1">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="BASE">Base Kit</SelectItem>
                        <SelectItem value="PLUS">Plus Kit</SelectItem>
                        <SelectItem value="PREMIUM">Premium Kit</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
            </div>

            <div>
              <Label htmlFor="notes">Notes (Optional)</Label>
              <Textarea
                id="notes"
                {...form.register('notes')}
                placeholder="Add any notes about this order..."
                className="min-h-[100px]"
              />
            </div>
          </div>

          <div className="flex gap-4">
            <Button 
              type="submit" 
              disabled={isSubmitting || !form.formState.isValid}
              className="flex-1"
            >
              {isSubmitting ? 'Creating Order...' : 'Create Order'}
            </Button>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
} 