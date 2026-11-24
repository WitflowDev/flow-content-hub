import 'server-only'
import type { LibrarySnapshot } from '@/lib/drive/library'
import { adminDb } from '@/lib/firebase/admin'

const PART_CHARS = 700_000

export type StoredLibrary = {
  snapshot: LibrarySnapshot
  syncedAt: number
}

export async function writeLibraryIndex(folderId: string, snapshot: LibrarySnapshot): Promise<void> {
  const parts = splitPayload(JSON.stringify(snapshot))
  const index = adminDb().collection('libraryIndex').doc(folderId)
  const batch = adminDb().batch()
  parts.forEach((json, indexPart) => {
    batch.set(index.collection('parts').doc(String(indexPart)), { json })
  })
  batch.set(index, { syncedAt: Date.now(), chunks: parts.length }, { merge: true })
  await batch.commit()
  const saved = await index.collection('parts').get()
  const extra = saved.docs.filter((doc) => Number(doc.id) >= parts.length)
  if (extra.length === 0) return
  const cleanup = adminDb().batch()
  for (const doc of extra) cleanup.delete(doc.ref)
  await cleanup.commit()
}

export async function readLibraryIndex(folderId: string): Promise<StoredLibrary | null> {
  const index = await adminDb().collection('libraryIndex').doc(folderId).get()
  const chunks = index.get('chunks')
  const syncedAt = index.get('syncedAt')
  if (!index.exists || typeof chunks !== 'number' || chunks < 1 || typeof syncedAt !== 'number') return null
  const parts = await Promise.all(
    Array.from({ length: chunks }, (_, part) => index.ref.collection('parts').doc(String(part)).get()),
  )
  const json = parts.map((part) => (typeof part.get('json') === 'string' ? part.get('json') : '')).join('')
  if (!json) return null
  try {
    const parsed: unknown = JSON.parse(json)
    if (!isSnapshot(parsed)) return null
    return { snapshot: parsed, syncedAt }
  } catch {
    return null
  }
}

export async function readStoredThumb(
  folderId: string,
  fileId: string,
): Promise<{ mimeType: string; base64: string } | null> {
  const saved = await adminDb().collection('libraryIndex').doc(folderId).collection('thumbs').doc(fileId).get()
  const mimeType = saved.get('mimeType')
  const base64 = saved.get('base64')
  if (!saved.exists || typeof mimeType !== 'string' || typeof base64 !== 'string' || base64.length === 0) return null
  return { mimeType, base64 }
}

export async function writeStoredThumb(
  folderId: string,
  fileId: string,
  thumb: { mimeType: string; base64: string },
): Promise<void> {
  await adminDb().collection('libraryIndex').doc(folderId).collection('thumbs').doc(fileId).set(thumb)
}

function splitPayload(json: string): string[] {
  if (json.length === 0) return ['']
  const parts: string[] = []
  for (let index = 0; index < json.length; index += PART_CHARS) parts.push(json.slice(index, index + PART_CHARS))
  return parts
}

function isSnapshot(value: unknown): value is LibrarySnapshot {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return Array.isArray(record.items) && Array.isArray(record.collections) && Array.isArray(record.fileIds) && !!record.thumbs
}
