import 'server-only'
import { unstable_cache } from 'next/cache'
import { onThumbnailInvalidated, thumbnailTag } from '@/lib/drive/cache'
import { openClientVideo } from '@/lib/drive/client'
import { VIDEO_PREFIX_CAP } from '@/lib/drive/prefix-budget'

const PREFIX_TTL_SECONDS = 60 * 60 * 12

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
const missing = new Set<string>()
const fillers = new Map<string, () => Promise<StoredPrefix>>()
const inflight = new Map<string, Promise<StoredPrefix>>()

onThumbnailInvalidated((fileId) => {
  const marker = `${fileId}:`
  for (const key of memory.keys()) {
    if (key.startsWith(marker)) memory.delete(key)
  }
  for (const key of missing) {
    if (key.startsWith(marker)) missing.delete(key)
  }
})

export async function fillVideoPrefix(
  folderId: string,
  fileId: string,
  version: string,
  end: number,
): Promise<DecodedPrefix> {
  const key = cacheKey(fileId, version)
  const hot = memory.get(key)
  if (hot && hot.bytes.length >= end + 1) return hot

  let pending = inflight.get(key)
  if (!pending) {
    fillers.set(key, () => downloadPrefix(folderId, fileId, end))
    pending = entry(fileId, version).finally(() => {
      fillers.delete(key)
      inflight.delete(key)
    })
    inflight.set(key, pending)
  }

  const decoded = decode(await pending)
  memory.set(key, decoded)
  missing.delete(key)
  return decoded
}

export async function readVideoPrefix(fileId: string, version: string): Promise<DecodedPrefix | null> {
  const key = cacheKey(fileId, version)
  const hot = memory.get(key)
  if (hot) return hot
  if (missing.has(key)) return null
  const pending = inflight.get(key)
  if (pending) {
    const decoded = decode(await pending)
    memory.set(key, decoded)
    missing.delete(key)
    return decoded
  }

  try {
    const decoded = decode(await entry(fileId, version))
    memory.set(key, decoded)
    missing.delete(key)
    return decoded
  } catch {
    missing.add(key)
    return null
  }
}

function entry(fileId: string, version: string): Promise<StoredPrefix> {
  const key = cacheKey(fileId, version)
  return unstable_cache(
    async () => {
      const produce = fillers.get(key)
      if (!produce) throw new Error('miss')
      return produce()
    },
    ['drive-video-prefix-v1', fileId, version],
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

function cacheKey(fileId: string, version: string): string {
  return `${fileId}:${version}`
}
