'use server'

import { favoriteLimit } from '@/lib/favorites'
import { favoriteIds } from '@/lib/favorites/store'
import { isDriveFileId } from '@/lib/drive/client'
import { loadDriveLibrary } from '@/lib/drive/library'
import { adminDb } from '@/lib/firebase/admin'
import { readUserProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'

type Result = { ok: true; fileIds: string[] } | { ok: false; message: string }

export async function toggleFavorite(fileId: string): Promise<Result> {
  const user = await getSessionUser()
  if (!user) return { ok: false, message: 'Sign in before saving a favorite.' }
  if (!isDriveFileId(fileId)) return { ok: false, message: 'That asset is not in your library.' }
  const profile = await readUserProfile(user.uid)
  const library = await loadDriveLibrary(user.uid, user.email, profile?.driveFolderId ?? null)
  if (!library.items.some((item) => item.driveFileId === fileId)) {
    return { ok: false, message: 'That asset is not in your library.' }
  }

  const ref = adminDb().collection('users').doc(user.uid)
  try {
    const fileIds = await adminDb().runTransaction(async (tx) => {
      const snap = await tx.get(ref)
      const current = favoriteIds(snap.get('favoriteFileIds'))
      const next = current.includes(fileId)
        ? current.filter((id) => id !== fileId)
        : [...current, fileId]
      if (next.length > favoriteLimit()) return null
      tx.set(ref, { favoriteFileIds: next }, { merge: true })
      return next
    })
    if (!fileIds) return { ok: false, message: 'Favorites is full. Remove one before adding another.' }
    return { ok: true, fileIds }
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'The favorite could not be saved.')
    return { ok: false, message: 'The favorite could not be saved.' }
  }
}
