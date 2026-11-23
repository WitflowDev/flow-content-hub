import 'server-only'
import { isDriveFileId } from '@/lib/drive/client'
import { adminDb } from '@/lib/firebase/admin'
import { favoriteLimit } from '@/lib/favorites'

export async function readFavoriteFileIds(uid: string): Promise<string[]> {
  const snap = await adminDb().collection('users').doc(uid).get()
  return favoriteIds(snap.get('favoriteFileIds'))
}

export function favoriteIds(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((id): id is string => typeof id === 'string' && isDriveFileId(id)).slice(0, favoriteLimit())
}
