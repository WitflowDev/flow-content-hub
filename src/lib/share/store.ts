import 'server-only'
import { randomBytes } from 'node:crypto'
import { FieldValue } from 'firebase-admin/firestore'
import { isDriveFileId } from '@/lib/drive/client'
import { adminDb } from '@/lib/firebase/admin'

const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export function isShareToken(value: string): boolean {
  return TOKEN_PATTERN.test(value)
}

export async function ensureCollectionShare(folderId: string): Promise<string> {
  if (!isDriveFileId(folderId)) throw new Error('That collection is not available.')
  const collection = adminDb().collection('collections').doc(folderId)
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(collection)
    const saved = snap.get('shareToken')
    if (typeof saved === 'string' && isShareToken(saved)) {
      tx.set(adminDb().collection('shares').doc(saved), { folderId }, { merge: true })
      return saved
    }
    const token = randomBytes(32).toString('base64url')
    tx.set(adminDb().collection('shares').doc(token), { folderId, createdAt: FieldValue.serverTimestamp() })
    tx.set(collection, { shareToken: token, driveFolderId: folderId }, { merge: true })
    return token
  })
}

export async function readShare(token: string): Promise<{ folderId: string } | null> {
  if (!isShareToken(token)) return null
  const saved = await adminDb().collection('shares').doc(token).get()
  const folderId = saved.get('folderId')
  if (!saved.exists || typeof folderId !== 'string' || !isDriveFileId(folderId)) return null
  const collection = await adminDb().collection('collections').doc(folderId).get()
  if (collection.get('shareToken') !== token) return null
  if (collection.get('published') === false) return null
  return { folderId }
}
