export const TIP_KEY = 'flow-tip-content'

export type AppRole = 'client' | 'admin'

export const ADMIN_EMAIL = 'info@flowproductions.pt'

export function isAdminUser(user: { email?: string | null } | null | undefined): boolean {
  return user?.email?.trim().toLowerCase() === ADMIN_EMAIL
}

export function roleForUser(user: { email?: string | null } | null | undefined): AppRole {
  return isAdminUser(user) ? 'admin' : 'client'
}
