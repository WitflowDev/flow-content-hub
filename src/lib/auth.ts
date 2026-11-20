export const TIP_KEY = 'flow-tip-content'

export type AppRole = 'client' | 'admin'

export function parseRole(role: unknown): AppRole {
  return role === 'admin' ? 'admin' : 'client'
}
