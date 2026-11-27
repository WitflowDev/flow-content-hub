import 'server-only'
import { parseRole } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { readUserProfile } from '@/lib/firebase/profile'
import { getFastSessionUser, getSessionUser, type SessionUser } from '@/lib/firebase/session'

const ADMIN_ROLE_TTL_MS = 30_000
const OWNED_FOLDER_TTL_MS = 60_000
const MAX_CACHE = 300

const adminRoleCache = new Map<string, { isAdmin: boolean; expiresAt: number }>()
const ownedFolderCache = new Map<string, { owned: boolean; expiresAt: number }>()

export async function requireAdmin(): Promise<SessionUser | null> {
  const user = await getSessionUser()
  if (!user) return null
  const profile = await readUserProfile(user.uid)
  if (!profile || parseRole(profile.role) !== 'admin') return null
  return user
}

// Fast local-JWT + short-TTL role check for high-frequency read-only admin media endpoints.
export async function requireFastAdmin(): Promise<SessionUser | null> {
  const user = await getFastSessionUser()
  if (!user) return null
  const now = Date.now()
  const hit = adminRoleCache.get(user.uid)
  if (hit && hit.expiresAt > now) {
    return hit.isAdmin ? user : null
  }
  const profile = await readUserProfile(user.uid)
  const isAdmin = Boolean(profile && parseRole(profile.role) === 'admin')
  if (adminRoleCache.size >= MAX_CACHE) {
    const oldest = adminRoleCache.keys().next().value
    if (oldest !== undefined) adminRoleCache.delete(oldest)
  }
  adminRoleCache.set(user.uid, { isAdmin, expiresAt: now + ADMIN_ROLE_TTL_MS })
  return isAdmin ? user : null
}

export async function isOwnedClientFolder(folderId: string): Promise<boolean> {
  const now = Date.now()
  const hit = ownedFolderCache.get(folderId)
  if (hit && hit.expiresAt > now) return hit.owned
  const owner = await adminDb().collection('users').where('driveFolderId', '==', folderId).limit(1).select().get()
  const owned = !owner.empty
  if (ownedFolderCache.size >= MAX_CACHE) {
    const oldest = ownedFolderCache.keys().next().value
    if (oldest !== undefined) ownedFolderCache.delete(oldest)
  }
  ownedFolderCache.set(folderId, { owned, expiresAt: now + OWNED_FOLDER_TTL_MS })
  return owned
}
