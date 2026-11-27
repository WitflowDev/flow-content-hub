import { unstable_cache } from 'next/cache'
import { thumbnailTag } from '@/lib/drive/cache'
import { wideClientImage, wideThumbnailForKnownFile, wideThumbnailFromLink } from '@/lib/drive/client'
import { sharedCollectionThumbMeta } from '@/lib/drive/library'
import { sharedContext, sharedFileAllowed } from '@/lib/share/media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PREVIEW_CACHE_SECONDS = 60 * 60 * 12
const PREVIEW_BYTE_LIMIT = 1_300_000

type RouteContext = { params: Promise<{ token: string; fileId: string }> }

type CachedPreview = {
  mimeType: string
  base64: string
}

export async function GET(request: Request, context: RouteContext) {
  const { token, fileId } = await context.params
  const shared = await sharedContext(token)
  if (!shared) return new Response('Not found', { status: 404 })

  const meta = shared.clientFolderId
    ? await sharedCollectionThumbMeta(shared.clientFolderId, shared.folderId, fileId)
    : null
  const etag = meta ? `W/"share-preview-${fileId}-${meta.version}"` : ''
  if (etag && matchesEtag(request.headers.get('if-none-match'), etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800' },
    })
  }

  if (meta) {
    try {
      const cached = await readCachedPreview(fileId, meta.version, meta.link)
      if (cached) {
        const bytes = Buffer.from(cached.base64, 'base64')
        return new Response(new Uint8Array(bytes), { headers: imageHeaders(cached.mimeType, etag) })
      }
    } catch {
      // Fall through to checked Drive fetch.
    }
  } else if (!(await sharedFileAllowed(fileId))) {
    return new Response('Not found', { status: 404 })
  }

  try {
    const image = await wideClientImage(shared.folderId, fileId)
    return new Response(image.body, { headers: imageHeaders(image.mimeType, etag) })
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
