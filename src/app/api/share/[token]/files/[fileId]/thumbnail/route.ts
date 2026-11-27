import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { after } from 'next/server'
import { gridThumbnailFromLink, thumbnailClientFile, thumbnailForKnownFile } from '@/lib/drive/client'
import { sharedCollectionThumbMeta } from '@/lib/drive/library'
import { readStoredThumb, writeStoredThumb } from '@/lib/library-index/store'
import { sharedContext, sharedFileAllowed } from '@/lib/share/media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const placeholderBytes = readFileSync(join(process.cwd(), 'public', 'assets', 'flow-logo-black.png'))
const MAX_STORED_THUMB_BYTES = 400_000

type RouteContext = { params: Promise<{ token: string; fileId: string }> }

export async function GET(request: Request, context: RouteContext) {
  const { token, fileId } = await context.params
  const shared = await sharedContext(token)
  if (!shared) return new Response('Not found', { status: 404 })

  const meta = shared.clientFolderId
    ? await sharedCollectionThumbMeta(shared.clientFolderId, shared.folderId, fileId)
    : null
  const etag = meta ? `W/"share-thumb-${fileId}-${meta.version}"` : ''
  if (etag && matchesEtag(request.headers.get('if-none-match'), etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800' },
    })
  }

  if (meta && shared.clientFolderId) {
    const stored = await readStoredThumb(shared.clientFolderId, fileId)
    if (stored) {
      const bytes = Buffer.from(stored.base64, 'base64')
      return new Response(new Uint8Array(bytes), { headers: imageHeaders(stored.mimeType, etag) })
    }
    try {
      const fromLink = meta.link ? await gridThumbnailFromLink(meta.link) : null
      const thumbnail = fromLink ?? (await thumbnailForKnownFile(fileId))
      if (!thumbnail) return placeholder()
      const bytes = Buffer.from(await new Response(thumbnail.body).arrayBuffer())
      if (bytes.byteLength === 0) return placeholder()
      if (bytes.byteLength <= MAX_STORED_THUMB_BYTES) {
        const clientFolderId = shared.clientFolderId
        const mimeType = thumbnail.mimeType
        const base64 = bytes.toString('base64')
        after(async () => {
          await writeStoredThumb(clientFolderId, fileId, { mimeType, base64 }).catch(() => undefined)
        })
      }
      return new Response(new Uint8Array(bytes), { headers: imageHeaders(thumbnail.mimeType, etag) })
    } catch {
      return placeholder()
    }
  }

  if (!(await sharedFileAllowed(fileId))) return new Response('Not found', { status: 404 })
  try {
    const thumbnail = await thumbnailClientFile(shared.folderId, fileId)
    if (!thumbnail) return placeholder()
    return new Response(thumbnail.body, { headers: imageHeaders(thumbnail.mimeType, etag) })
  } catch {
    return placeholder()
  }
}

function imageHeaders(mimeType: string, etag: string): HeadersInit {
  return {
    'Content-Type': mimeType,
    ...(etag ? { ETag: etag } : {}),
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
    },
  })
}
