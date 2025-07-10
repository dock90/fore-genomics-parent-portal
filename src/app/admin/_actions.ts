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

export async function deleteUser(formData: FormData) {
  if (!checkRole('ADMIN')) {
    return
  }

  try {
    const userId = formData.get('userId') as string
    const userEmail = formData.get('userEmail') as string
    
    // Get the user from our database first to get the email
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { email: true }
    })
    
    if (!user) {
      console.error('User not found in database:', userId)
      return
    }
    
    // Delete from our database first (this will cascade to related records)
    await prisma.user.delete({
      where: { id: userId }
    })
    
    // Find and delete from Clerk using email
    const client = await clerkClient()
    try {
      // Find the Clerk user by email
      const clerkUsers = await client.users.getUserList({ emailAddress: [user.email] })
      const clerkUser = clerkUsers.data[0]
      
      if (clerkUser) {
        // Clear all metadata before deletion
        try {
          await client.users.updateUser(clerkUser.id, {
            publicMetadata: {},
            privateMetadata: {},
            unsafeMetadata: {}
          })
        } catch (metadataError) {
          console.error('Error clearing Clerk metadata:', metadataError)
          // Continue with deletion even if metadata clearing fails
        }
        
        // Delete from Clerk
        await client.users.deleteUser(clerkUser.id)
      } else {
        console.log('Clerk user not found for email:', user.email)
      }
    } catch (clerkError) {
      console.error('Error with Clerk operations:', clerkError)
      // Continue even if Clerk operations fail
    }
  } catch (err) {
    console.error('Error deleting user:', err)
  }
}

export async function deleteUserProfile(formData: FormData) {
  if (!checkRole('ADMIN')) {
    return
  }

  try {
    const profileId = formData.get('profileId') as string
    
    await prisma.userProfile.delete({
      where: { id: profileId }
    })
  } catch (err) {
    console.error('Error deleting user profile:', err)
  }
}

export async function deleteConsent(formData: FormData) {
  if (!checkRole('ADMIN')) {
    return
  }

  try {
    const consentId = formData.get('consentId') as string
    
    await prisma.consent.delete({
      where: { id: consentId }
    })
  } catch (err) {
    console.error('Error deleting consent:', err)
  }
}

export async function deleteChild(formData: FormData) {
  if (!checkRole('ADMIN')) {
    return
  }

  try {
    const childId = formData.get('childId') as string
    
    await prisma.child.delete({
      where: { id: childId }
    })
  } catch (err) {
    console.error('Error deleting child:', err)
  }
}

export async function deleteQuestionnaire(formData: FormData) {
  if (!checkRole('ADMIN')) {
    return
  }

  try {
    const questionnaireId = formData.get('questionnaireId') as string
    
    await prisma.questionnaire.delete({
      where: { id: questionnaireId }
    })
  } catch (err) {
    console.error('Error deleting questionnaire:', err)
  }
}

export async function deleteOrder(formData: FormData) {
  if (!checkRole('ADMIN')) {
    return
  }

  try {
    const orderId = formData.get('orderId') as string
    
    await prisma.order.delete({
      where: { id: orderId }
    })
  } catch (err) {
    console.error('Error deleting order:', err)
  }
} 