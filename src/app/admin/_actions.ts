'use server'

import { checkRole } from '@/utils/roles'
import { clerkClient } from '@clerk/nextjs/server'
import { prisma } from '@/lib/prisma'

export async function setRole(formData: FormData) {
  const client = await clerkClient()

  // Check that the user trying to set the role is an admin
  if (!checkRole('ADMIN')) {
    return
  }

  try {
    await client.users.updateUserMetadata(formData.get('id') as string, {
      publicMetadata: { role: formData.get('role') },
    })
  } catch (err) {
    console.error('Error setting role:', err)
  }
}

export async function removeRole(formData: FormData) {
  const client = await clerkClient()

  try {
    await client.users.updateUserMetadata(formData.get('id') as string, {
      publicMetadata: { role: null },
    })
  } catch (err) {
    console.error('Error removing role:', err)
  }
}

export async function updateOrderStatus(formData: FormData) {
  // Check that the user trying to update the order is an admin
  if (!checkRole('ADMIN')) {
    return
  }

  try {
    const orderId = formData.get('orderId') as string
    const status = formData.get('status') as string
    const notes = formData.get('notes') as string

    await prisma.order.update({
      where: { id: orderId },
      data: {
        status: status as any,
        notes: notes || null,
        statusUpdatedAt: new Date(),
      },
    })
  } catch (err) {
    console.error('Error updating order status:', err)
  }
} 