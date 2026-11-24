import 'server-only'
import { randomBytes } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { isDriveFileId } from '@/lib/drive/ids'
import { adminDb } from '@/lib/firebase/admin'
import { isShareToken, resolveSharedFolder, shareExpiresAtMs } from '@/lib/share/policy'

export { isShareToken } from '@/lib/share/policy'

export async function ensureCollectionShare(folderId: string, days: number): Promise<string> {
  if (!isDriveFileId(folderId)) throw new Error('That collection is not available.')
  const expiresAt = Timestamp.fromMillis(shareExpiresAtMs(days, Date.now()))
  const collection = adminDb().collection('collections').doc(folderId)
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(collection)
    const saved = snap.get('shareToken')
    if (typeof saved === 'string' && isShareToken(saved)) {
      tx.set(adminDb().collection('shares').doc(saved), { folderId, expiresAt }, { merge: true })
      return saved
    }
    const token = randomBytes(32).toString('base64url')
    tx.set(adminDb().collection('shares').doc(token), {
      folderId,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    })
    tx.set(collection, { shareToken: token, driveFolderId: folderId }, { merge: true })
    return token
  })
}

export async function readShare(token: string): Promise<{ folderId: string } | null> {
  if (!isShareToken(token)) return null
  const saved = await adminDb().collection('shares').doc(token).get()
  const shareFolderId = saved.get('folderId')
  if (!saved.exists || typeof shareFolderId !== 'string' || !isDriveFileId(shareFolderId)) return null
  const collection = await adminDb().collection('collections').doc(shareFolderId).get()
  const folderId = resolveSharedFolder({
    token,
    shareFolderId,
    collectionToken: collection.get('shareToken'),
    published: collection.get('published'),
    expiresAtMs: expiryMillis(saved.get('expiresAt')),
    nowMs: Date.now(),
  })
  return folderId ? { folderId } : null
}

function expiryMillis(value: unknown): number | null {
  if (value == null) return null
  if (value instanceof Timestamp) return value.toMillis()
  return 0
}
