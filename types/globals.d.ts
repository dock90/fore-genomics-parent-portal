export {}

export type UserRole = 'ADMIN' | 'COUNSELOR' | 'PARENT' | 'PURCHASER'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      role?: UserRole
    }
  }
}