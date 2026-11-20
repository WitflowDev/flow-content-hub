import 'server-only'
import { parseRole } from '@/lib/auth'
import { readUserProfile } from '@/lib/firebase/profile'
import { getSessionUser, type SessionUser } from '@/lib/firebase/session'

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser()
  if (!user) return null
  const profile = await readUserProfile(user.uid)
  if (!profile || parseRole(profile.role) !== 'admin') return null
  return user
}
