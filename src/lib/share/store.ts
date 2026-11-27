import 'server-only'
import { randomBytes } from 'node:crypto'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { isDriveFileId } from '@/lib/drive/ids'
import { adminDb } from '@/lib/firebase/admin'
import { isShareToken, resolveSharedFolder, shareExpiresAtMs } from '@/lib/share/policy'

export { isShareToken } from '@/lib/share/policy'

export type ShareRecord = {
  folderId: string
  ownerId: string
  expiresAtMs: number | null
}

const SHARE_CACHE_TTL_MS = 30_000
const MAX_SHARE_CACHE = 200
const shareCache = new Map<string, { value: ShareRecord | null; expiresAt: number }>()
const shareInflight = new Map<string, Promise<ShareRecord | null>>()

export async function ensureCollectionShare(folderId: string, days: number): Promise<string> {
  if (!isDriveFileId(folderId)) throw new Error('That collection is not available.')
  const expiresAt = Timestamp.fromMillis(shareExpiresAtMs(days, Date.now()))
  const collection = adminDb().collection('collections').doc(folderId)
  const token = await adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(collection)
    const saved = snap.get('shareToken')
    if (typeof saved === 'string' && isShareToken(saved)) {
      tx.set(adminDb().collection('shares').doc(saved), { folderId, expiresAt }, { merge: true })
      return saved
    }
    const created = randomBytes(32).toString('base64url')
    tx.set(adminDb().collection('shares').doc(created), {
      folderId,
      createdAt: FieldValue.serverTimestamp(),
      expiresAt,
    })
    tx.set(collection, { shareToken: created, driveFolderId: folderId }, { merge: true })
    return created
  })
  shareCache.delete(token)
  return token
}

export async function readShare(token: string): Promise<ShareRecord | null> {
  if (!isShareToken(token)) return null
  const now = Date.now()
  const hit = shareCache.get(token)
  if (hit && hit.expiresAt > now) {
    if (!hit.value) return null
    if (hit.value.expiresAtMs !== null && hit.value.expiresAtMs <= now) {
      shareCache.delete(token)
      return null
    }
    return hit.value
  }
  if (hit) shareCache.delete(token)

  const pending = shareInflight.get(token)
  if (pending) return pending

  const next = fetchShare(token)
    .then((record) => {
      if (shareCache.size >= MAX_SHARE_CACHE) {
        const oldest = shareCache.keys().next().value
        if (oldest !== undefined) shareCache.delete(oldest)
      }
      shareCache.set(token, { value: record, expiresAt: Date.now() + SHARE_CACHE_TTL_MS })
      return record
    })
    .finally(() => {
      shareInflight.delete(token)
    })
  shareInflight.set(token, next)
  return next
}

async function fetchShare(token: string): Promise<ShareRecord | null> {
  const saved = await adminDb().collection('shares').doc(token).get()
  const shareFolderId = saved.get('folderId')
  if (!saved.exists || typeof shareFolderId !== 'string' || !isDriveFileId(shareFolderId)) return null
  const collection = await adminDb().collection('collections').doc(shareFolderId).get()
  const expiresAtMs = expiryMillis(saved.get('expiresAt'))
  const folderId = resolveSharedFolder({
    token,
    shareFolderId,
    collectionToken: collection.get('shareToken'),
    published: collection.get('published'),
    expiresAtMs,
    nowMs: Date.now(),
  })
  if (!folderId) return null
  const profileId = collection.get('profileId')
  return {
    folderId,
    ownerId: typeof profileId === 'string' ? profileId : '',
    expiresAtMs,
  }
}

function expiryMillis(value: unknown): number | null {
  if (value == null) return null
  if (value instanceof Timestamp) return value.toMillis()
  return 0
}
