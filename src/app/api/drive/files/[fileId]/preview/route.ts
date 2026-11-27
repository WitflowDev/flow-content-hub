import { unstable_cache } from 'next/cache'
import { thumbnailTag } from '@/lib/drive/cache'
import { wideClientImage, wideThumbnailForKnownFile, wideThumbnailFromLink } from '@/lib/drive/client'
import { libraryThumb } from '@/lib/drive/library'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PREVIEW_CACHE_SECONDS = 60 * 60 * 12
// Keep raw bytes below 1.3 MB so base64 JSON stays safely under Next.js's 2 MB Data Cache limit.
const PREVIEW_BYTE_LIMIT = 1_300_000

type RouteContext = {
  params: Promise<{ fileId: string }>
}

type CachedPreview = {
  mimeType: string
  base64: string
}

export async function GET(request: Request, context: RouteContext) {
  const { fileId } = await context.params
  const folder = await driveFolderForCurrentUser()
  if (!folder) return new Response('Not found', { status: 404 })

  const known = await libraryThumb(folder.id, fileId)
  if (known.status === 'hidden') return new Response('Not found', { status: 404 })

  const etag = known.status === 'visible' ? `W/"preview-${fileId}-${known.version}"` : ''
  if (etag && matchesEtag(request.headers.get('if-none-match'), etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800' },
    })
  }

  if (known.status === 'visible') {
    try {
      const cached = await readCachedPreview(fileId, known.version, known.link)
      if (cached) return image(cached, etag)
    } catch {
      // A full-size original is not cached. Fall through to the checked fetch.
    }
  }

  try {
    const picture = await wideClientImage(folder.id, fileId)
    return new Response(picture.body, { headers: imageHeaders(picture.mimeType, etag) })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

function readCachedPreview(fileId: string, version: string, link: string | null): Promise<CachedPreview | null> {
  return unstable_cache(
    async () => {
      const picture = link ? await wideThumbnailFromLink(link) : await wideThumbnailForKnownFile(fileId)
      if (!picture) throw new Error('no-preview')
      const bytes = Buffer.from(await new Response(picture.body).arrayBuffer())
      if (bytes.byteLength === 0 || bytes.byteLength > PREVIEW_BYTE_LIMIT) throw new Error('no-preview')
      return { mimeType: picture.mimeType, base64: bytes.toString('base64') }
    },
    ['drive-preview-v2', fileId, version],
    { revalidate: PREVIEW_CACHE_SECONDS, tags: [thumbnailTag(fileId)] },
  )()
}

function image(cached: CachedPreview, etag: string): Response {
  const bytes = Buffer.from(cached.base64, 'base64')
  return new Response(new Uint8Array(bytes), { headers: imageHeaders(cached.mimeType, etag) })
}

function imageHeaders(mimeType: string, etag: string): HeadersInit {
  return {
    'Content-Type': mimeType,
    'Content-Disposition': 'inline',
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
