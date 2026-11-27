import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { after } from 'next/server'
import { gridThumbnailFromLink, thumbnailForKnownFile } from '@/lib/drive/client'
import { libraryThumb } from '@/lib/drive/library'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'
import { drainJob } from '@/lib/jobs/loop'
import { enqueueJob } from '@/lib/jobs/queue'
import { readStoredThumb, writeStoredThumb } from '@/lib/library-index/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const placeholderBytes = readFileSync(join(process.cwd(), 'public', 'assets', 'flow-logo-black.png'))
const MAX_STORED_THUMB_BYTES = 400_000

type RouteContext = {
  params: Promise<{ fileId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { fileId } = await context.params
  const folder = await driveFolderForCurrentUser()
  if (!folder) return placeholder()

  const known = await libraryThumb(folder.id, fileId)
  if (!known.listed) return placeholder()

  const etag = `W/"thumb-${fileId}-${known.version}"`
  if (matchesEtag(request.headers.get('if-none-match'), etag)) {
    return new Response(null, { status: 304, headers: { ETag: etag, 'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800' } })
  }

  const stored = await readStoredThumb(folder.id, fileId)
  if (stored) return image(stored, etag)

  const picture = await driveThumb(known.link, fileId)
  if (!picture) {
    const jobId = await enqueueJob({ kind: 'warm-thumbnails', folderId: folder.id, uid: 'library' })
    after(() => drainJob(jobId))
    return placeholder()
  }
  const bytes = Buffer.from(await new Response(picture.body).arrayBuffer())
  if (bytes.byteLength === 0) return placeholder()
  if (bytes.byteLength <= MAX_STORED_THUMB_BYTES) {
    const folderId = folder.id
    const mimeType = picture.mimeType
    const base64 = bytes.toString('base64')
    after(async () => {
      await writeStoredThumb(folderId, fileId, { mimeType, base64 }).catch(() => undefined)
    })
  }
  return new Response(new Uint8Array(bytes), { headers: imageHeaders(picture.mimeType, etag) })
}

async function driveThumb(link: string | null, fileId: string): Promise<{ mimeType: string; body: ReadableStream<Uint8Array> } | null> {
  if (link) {
    const fromLink = await gridThumbnailFromLink(link)
    if (fromLink) return fromLink
  }
  return thumbnailForKnownFile(fileId)
}

function image(cached: { mimeType: string; base64: string }, etag: string): Response {
  const bytes = Buffer.from(cached.base64, 'base64')
  return new Response(new Uint8Array(bytes), { headers: imageHeaders(cached.mimeType, etag) })
}

function imageHeaders(mimeType: string, etag: string): HeadersInit {
  return {
    'Content-Type': mimeType,
    ETag: etag,
    'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800',
  }
}

function matchesEtag(header: string | null, etag: string): boolean {
  if (!header) return false
  return header
    .split(',')
    .map((part) => part.trim())
    .includes(etag)
}

function placeholder(): Response {
  return new Response(placeholderBytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
      'X-Flow-Thumb': 'preparing',
    },
  })
}
