import 'server-only'
import type { LibrarySnapshot } from '@/lib/drive/library'
import { adminDb } from '@/lib/firebase/admin'

// Keep each chunk safely under Firestore's 1 MiB document limit in UTF-8 bytes
// and each WriteBatch safely under the 10 MiB batch payload limit.
const PART_MAX_UTF8_BYTES = 550_000
const WRITE_BATCH_DOCS = 8
const MEMORY_CACHE_TTL_MS = 20_000
const MAX_MEMORY_INDEXES = 200
const THUMB_MEMORY_TTL_MS = 5 * 60_000
const THUMB_MEMORY_MAX_BYTES = 32 * 1024 * 1024

export type StoredLibrary = {
  snapshot: LibrarySnapshot
  syncedAt: number
}

type StoredThumb = { mimeType: string; base64: string }

const indexCache = new Map<string, { value: StoredLibrary | null; expiresAt: number }>()
const indexInflight = new Map<string, Promise<StoredLibrary | null>>()
const thumbCache = new Map<string, { value: StoredThumb; bytes: number; expiresAt: number }>()
const thumbInflight = new Map<string, Promise<StoredThumb | null>>()
let thumbCacheBytes = 0

function thumbCacheKey(folderId: string, fileId: string): string {
  return `${folderId}:${fileId}`
}

function readThumbMemory(folderId: string, fileId: string): StoredThumb | null {
  const key = thumbCacheKey(folderId, fileId)
  const hit = thumbCache.get(key)
  if (!hit) return null
  if (hit.expiresAt <= Date.now()) {
    thumbCache.delete(key)
    thumbCacheBytes -= hit.bytes
    return null
  }
  // Refresh LRU order.
  thumbCache.delete(key)
  thumbCache.set(key, hit)
  return hit.value
}

function writeThumbMemory(folderId: string, fileId: string, value: StoredThumb): void {
  const bytes = value.base64.length + value.mimeType.length
  if (bytes > 600_000) return
  const key = thumbCacheKey(folderId, fileId)
  const existing = thumbCache.get(key)
  if (existing) {
    thumbCache.delete(key)
    thumbCacheBytes -= existing.bytes
  }
  while (thumbCacheBytes + bytes > THUMB_MEMORY_MAX_BYTES && thumbCache.size > 0) {
    const oldestKey = thumbCache.keys().next().value
    if (oldestKey === undefined) break
    const oldest = thumbCache.get(oldestKey)
    thumbCache.delete(oldestKey)
    if (oldest) thumbCacheBytes -= oldest.bytes
  }
  thumbCache.set(key, { value, bytes, expiresAt: Date.now() + THUMB_MEMORY_TTL_MS })
  thumbCacheBytes += bytes
}

function deleteThumbMemory(folderId: string, fileId: string): void {
  const key = thumbCacheKey(folderId, fileId)
  const existing = thumbCache.get(key)
  if (existing) {
    thumbCache.delete(key)
    thumbCacheBytes -= existing.bytes
  }
}

function writeIndexMemory(folderId: string, value: StoredLibrary | null): void {
  if (indexCache.size >= MAX_MEMORY_INDEXES) {
    const oldest = indexCache.keys().next().value
    if (oldest !== undefined) indexCache.delete(oldest)
  }
  indexCache.set(folderId, { value, expiresAt: Date.now() + MEMORY_CACHE_TTL_MS })
}

export async function writeLibraryIndex(folderId: string, snapshot: LibrarySnapshot): Promise<void> {
  const parts = splitUtf8Payload(JSON.stringify(snapshot))
  const generation = `g${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
  const db = adminDb()
  const index = db.collection('libraryIndex').doc(folderId)
  const partsCol = index.collection('parts')

  // Write new generation chunks in bounded batches before atomically flipping the pointer doc.
  for (let start = 0; start < parts.length; start += WRITE_BATCH_DOCS) {
    const batch = db.batch()
    const end = Math.min(start + WRITE_BATCH_DOCS, parts.length)
    for (let i = start; i < end; i += 1) {
      batch.set(partsCol.doc(`${generation}_${i}`), { json: parts[i] })
    }
    await batch.commit()
  }

  const syncedAt = Date.now()
  await index.set({ syncedAt, chunks: parts.length, generation }, { merge: true })
  writeIndexMemory(folderId, { snapshot, syncedAt })

  // Delete stale chunks from previous generations using field-masked ID-only reads.
  const keep = new Set(parts.map((_, i) => `${generation}_${i}`))
  const saved = await partsCol.select().get()
  const stale = saved.docs.filter((doc) => !keep.has(doc.id))
  for (let start = 0; start < stale.length; start += 400) {
    const cleanup = db.batch()
    for (const doc of stale.slice(start, start + 400)) cleanup.delete(doc.ref)
    await cleanup.commit()
  }
}

export async function readLibraryIndex(folderId: string): Promise<StoredLibrary | null> {
  const cached = indexCache.get(folderId)
  if (cached && cached.expiresAt > Date.now()) return cached.value
  if (cached) indexCache.delete(folderId)

  const inflight = indexInflight.get(folderId)
  if (inflight) return inflight

  const pending = fetchLibraryIndex(folderId)
    .then((result) => {
      writeIndexMemory(folderId, result)
      return result
    })
    .finally(() => {
      indexInflight.delete(folderId)
    })
  indexInflight.set(folderId, pending)
  return pending
}

async function fetchLibraryIndex(folderId: string): Promise<StoredLibrary | null> {
  const index = await adminDb().collection('libraryIndex').doc(folderId).get()
  const chunks = index.get('chunks')
  const syncedAt = index.get('syncedAt')
  const generation = index.get('generation')
  if (!index.exists || typeof chunks !== 'number' || chunks < 1 || typeof syncedAt !== 'number') return null
  const prefix = typeof generation === 'string' && generation.length > 0 ? `${generation}_` : ''
  const parts = await Promise.all(
    Array.from({ length: chunks }, (_, part) => index.ref.collection('parts').doc(`${prefix}${part}`).get()),
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

export async function listStoredThumbIds(folderId: string): Promise<Set<string>> {
  const snap = await adminDb().collection('libraryIndex').doc(folderId).collection('thumbs').select().get()
  return new Set(snap.docs.map((doc) => doc.id))
}

export async function readStoredThumb(
  folderId: string,
  fileId: string,
): Promise<{ mimeType: string; base64: string } | null> {
  const cached = readThumbMemory(folderId, fileId)
  if (cached) return cached

  const key = thumbCacheKey(folderId, fileId)
  const inflight = thumbInflight.get(key)
  if (inflight) return inflight

  const pending = adminDb()
    .collection('libraryIndex')
    .doc(folderId)
    .collection('thumbs')
    .doc(fileId)
    .get()
    .then((saved) => {
      if (!saved.exists || saved.get('skipped') === true) return null
      const mimeType = saved.get('mimeType')
      const base64 = saved.get('base64')
      if (typeof mimeType !== 'string' || typeof base64 !== 'string' || base64.length === 0) return null
      const thumb = { mimeType, base64 }
      writeThumbMemory(folderId, fileId, thumb)
      return thumb
    })
    .finally(() => {
      thumbInflight.delete(key)
    })
  thumbInflight.set(key, pending)
  return pending
}

export async function writeStoredThumb(
  folderId: string,
  fileId: string,
  thumb: { mimeType: string; base64: string },
): Promise<void> {
  writeThumbMemory(folderId, fileId, thumb)
  await adminDb()
    .collection('libraryIndex')
    .doc(folderId)
    .collection('thumbs')
    .doc(fileId)
    .set({ mimeType: thumb.mimeType, base64: thumb.base64, skipped: false, updatedAt: Date.now() })
}

export async function markSkippedThumb(folderId: string, fileId: string): Promise<void> {
  deleteThumbMemory(folderId, fileId)
  await adminDb()
    .collection('libraryIndex')
    .doc(folderId)
    .collection('thumbs')
    .doc(fileId)
    .set({ skipped: true, updatedAt: Date.now() })
}

function splitUtf8Payload(json: string): string[] {
  if (json.length === 0) return ['']
  const parts: string[] = []
  let start = 0
  while (start < json.length) {
    // Fast estimate: every char is at most 3 UTF-8 bytes (or 4 for surrogate pairs).
    let end = Math.min(json.length, start + Math.floor(PART_MAX_UTF8_BYTES / 2))
    while (end < json.length) {
      const nextEnd = Math.min(json.length, end + 32_768)
      if (Buffer.byteLength(json.slice(start, nextEnd), 'utf8') > PART_MAX_UTF8_BYTES) break
      end = nextEnd
    }
    while (end > start + 1 && Buffer.byteLength(json.slice(start, end), 'utf8') > PART_MAX_UTF8_BYTES) {
      end -= 4096
    }
    // Avoid splitting a UTF-16 surrogate pair across chunks.
    if (end < json.length && end > start) {
      const code = json.charCodeAt(end - 1)
      if (code >= 0xd800 && code <= 0xdbff) end -= 1
    }
    if (end <= start) end = Math.min(json.length, start + 1)
    parts.push(json.slice(start, end))
    start = end
  }
  return parts
}

function isSnapshot(value: unknown): value is LibrarySnapshot {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return Array.isArray(record.items) && Array.isArray(record.collections) && Array.isArray(record.fileIds) && !!record.thumbs
}
