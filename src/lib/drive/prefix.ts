import 'server-only'
import { unstable_cache } from 'next/cache'
import { onThumbnailInvalidated, thumbnailTag } from '@/lib/drive/cache'
import { openClientVideo } from '@/lib/drive/client'
import { VIDEO_PREFIX_CAP } from '@/lib/drive/prefix-budget'

const PREFIX_TTL_SECONDS = 60 * 60 * 12
const MAX_MEMORY_BYTES = 48 * 1024 * 1024
const MAX_DATA_CACHE_RAW_BYTES = 1_300_000
const MISSING_TTL_MS = 30_000
const MAX_MISSING_ENTRIES = 500

type StoredPrefix = {
  mimeType: string
  name: string
  total: number
  base64: string
}

export type DecodedPrefix = {
  mimeType: string
  name: string
  total: number
  bytes: Uint8Array
}

const memory = new Map<string, DecodedPrefix>()
let memoryBytes = 0
const missing = new Map<string, number>()
const fillers = new Map<string, () => Promise<StoredPrefix>>()
const inflight = new Map<string, Promise<DecodedPrefix>>()

function setMemory(key: string, value: DecodedPrefix): void {
  const existing = memory.get(key)
  if (existing) {
    memoryBytes -= existing.bytes.byteLength
    memory.delete(key)
  }
  const size = value.bytes.byteLength
  if (size > MAX_MEMORY_BYTES) return
  while (memoryBytes + size > MAX_MEMORY_BYTES && memory.size > 0) {
    const oldest = memory.entries().next().value
    if (!oldest) break
    memory.delete(oldest[0])
    memoryBytes -= oldest[1].bytes.byteLength
  }
  memory.set(key, value)
  memoryBytes += size
}

function touchMemory(key: string): DecodedPrefix | undefined {
  const entry = memory.get(key)
  if (!entry) return undefined
  memory.delete(key)
  memory.set(key, entry)
  return entry
}

function isMissing(key: string): boolean {
  const expiresAt = missing.get(key)
  if (expiresAt === undefined) return false
  if (expiresAt <= Date.now()) {
    missing.delete(key)
    return false
  }
  return true
}

function markMissing(key: string): void {
  if (missing.size >= MAX_MISSING_ENTRIES) {
    const oldest = missing.keys().next().value
    if (oldest !== undefined) missing.delete(oldest)
  }
  missing.set(key, Date.now() + MISSING_TTL_MS)
}

onThumbnailInvalidated((fileId) => {
  const marker = `${fileId}:`
  for (const [key, value] of memory) {
    if (key.startsWith(marker)) {
      memory.delete(key)
      memoryBytes -= value.bytes.byteLength
    }
  }
  for (const key of missing.keys()) {
    if (key.startsWith(marker)) missing.delete(key)
  }
})

export async function fillVideoPrefix(
  folderId: string,
  fileId: string,
  version: string,
  end: number,
): Promise<DecodedPrefix> {
  const safeEnd = Math.min(Math.max(0, Math.floor(end)), VIDEO_PREFIX_CAP - 1)
  const key = cacheKey(fileId, version, safeEnd)
  const hot = touchMemory(key)
  if (hot && hot.bytes.length >= safeEnd + 1) return hot

  let pending = inflight.get(key)
  if (!pending) {
    pending = loadAndStorePrefix(folderId, fileId, version, safeEnd, key).finally(() => {
      fillers.delete(key)
      inflight.delete(key)
    })
    inflight.set(key, pending)
  }

  const decoded = await pending
  setMemory(key, decoded)
  missing.delete(key)
  return decoded
}

async function loadAndStorePrefix(
  folderId: string,
  fileId: string,
  version: string,
  end: number,
  key: string,
): Promise<DecodedPrefix> {
  if (end + 1 <= MAX_DATA_CACHE_RAW_BYTES) {
    fillers.set(key, () => downloadPrefix(folderId, fileId, end))
    return decode(await entry(fileId, version, end))
  }
  return decode(await downloadPrefix(folderId, fileId, end))
}

export async function readVideoPrefix(fileId: string, version: string, preferredEnd?: number): Promise<DecodedPrefix | null> {
  const prefixMarker = `${fileId}:${version}:`
  for (const [key, value] of memory) {
    if (key.startsWith(prefixMarker)) {
      memory.delete(key)
      memory.set(key, value)
      return value
    }
  }
  const lookupEnd = Math.min(Math.max(0, preferredEnd ?? MAX_DATA_CACHE_RAW_BYTES - 1), MAX_DATA_CACHE_RAW_BYTES - 1)
  const key = cacheKey(fileId, version, lookupEnd)
  if (isMissing(key)) return null
  const pending = inflight.get(key)
  if (pending) {
    const decoded = await pending
    setMemory(key, decoded)
    missing.delete(key)
    return decoded
  }

  try {
    const decoded = decode(await entry(fileId, version, lookupEnd))
    setMemory(key, decoded)
    missing.delete(key)
    return decoded
  } catch {
    markMissing(key)
    return null
  }
}

function entry(fileId: string, version: string, end: number): Promise<StoredPrefix> {
  const key = cacheKey(fileId, version, end)
  return unstable_cache(
    async () => {
      const produce = fillers.get(key)
      if (!produce) throw new Error('miss')
      return produce()
    },
    ['drive-video-prefix-v2', fileId, version, String(end)],
    { revalidate: PREFIX_TTL_SECONDS, tags: [thumbnailTag(fileId)] },
  )()
}

async function downloadPrefix(folderId: string, fileId: string, end: number): Promise<StoredPrefix> {
  const file = await openClientVideo(folderId, fileId, `bytes=0-${end}`)
  const bytes = Buffer.from(await new Response(file.body).arrayBuffer())
  if (bytes.byteLength === 0 || bytes.byteLength > VIDEO_PREFIX_CAP) throw new Error('prefix')
  return {
    mimeType: file.mimeType,
    name: file.name,
    total: totalBytes(file.contentRange, bytes.byteLength),
    base64: bytes.toString('base64'),
  }
}

function decode(stored: StoredPrefix): DecodedPrefix {
  return {
    mimeType: stored.mimeType,
    name: stored.name,
    total: stored.total,
    bytes: Buffer.from(stored.base64, 'base64'),
  }
}

function totalBytes(contentRange: string | null, downloaded: number): number {
  const match = contentRange?.match(/\/(\d+)\s*$/)
  const total = match ? Number(match[1]) : downloaded
  if (!Number.isFinite(total) || total < downloaded) return downloaded
  return total
}

function cacheKey(fileId: string, version: string, end: number): string {
  return `${fileId}:${version}:${end}`
}
