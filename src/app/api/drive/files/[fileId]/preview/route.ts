import { unstable_cache } from 'next/cache'
import { thumbnailTag } from '@/lib/drive/cache'
import { wideClientImage, wideThumbnailForKnownFile, wideThumbnailFromLink } from '@/lib/drive/client'
import { libraryThumb } from '@/lib/drive/library'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const PREVIEW_CACHE_SECONDS = 60 * 60 * 12
const PREVIEW_BYTE_LIMIT = 2_000_000

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

  const version = new URL(request.url).searchParams.get('v') ?? ''
  const known = await libraryThumb(folder.id, fileId)
  if (known.listed) {
    try {
      const cached = await readCachedPreview(fileId, version, known.link)
      if (cached) return image(cached)
    } catch {
      // A full-size original is not cached. Fall through to the checked fetch.
    }
  }

  try {
    const picture = await wideClientImage(folder.id, fileId)
    return new Response(picture.body, { headers: imageHeaders(picture.mimeType) })
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
    ['drive-preview-v1', fileId, version],
    { revalidate: PREVIEW_CACHE_SECONDS, tags: [thumbnailTag(fileId)] },
  )()
}

function image(cached: CachedPreview): Response {
  const bytes = Buffer.from(cached.base64, 'base64')
  return new Response(new Uint8Array(bytes), { headers: imageHeaders(cached.mimeType) })
}

function imageHeaders(mimeType: string): HeadersInit {
  return {
    'Content-Type': mimeType,
    'Content-Disposition': 'inline',
    'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800',
  }
}
