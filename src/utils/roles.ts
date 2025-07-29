import { auth } from '@clerk/nextjs/server'

export async function checkRole(role: string) {
  const { sessionClaims } = await auth()
  const userRole = (sessionClaims?.metadata as any)?.role
  return userRole === role
} 