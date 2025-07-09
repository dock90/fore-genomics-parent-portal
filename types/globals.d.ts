export {}

export type UserRole = 'ADMIN' | 'COUNSELOR' | 'PARENT'

declare global {
  interface CustomJwtSessionClaims {
    metadata: {
      onboardingComplete?: boolean
      role?: UserRole
    }
  }
}