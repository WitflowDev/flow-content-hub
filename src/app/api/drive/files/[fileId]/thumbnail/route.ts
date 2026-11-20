import { unstable_cache } from 'next/cache'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { thumbnailTag } from '@/lib/drive/cache'
import { gridThumbnailFromLink, thumbnailClientFile, thumbnailForKnownFile } from '@/lib/drive/client'
import { libraryThumb } from '@/lib/drive/library'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const THUMB_CACHE_SECONDS = 60 * 60 * 12
const placeholderBytes = readFileSync(join(process.cwd(), 'public', 'assets', 'flow-logo-black.png'))

type RouteContext = {
  params: Promise<{ fileId: string }>
}

type CachedThumb = {
  mimeType: string
  base64: string
}

export async function GET(request: Request, context: RouteContext) {
  const { fileId } = await context.params
  const folder = await driveFolderForCurrentUser()
  if (!folder) return placeholder()

  const version = new URL(request.url).searchParams.get('v') ?? ''
  const known = await libraryThumb(folder.id, fileId)
  if (known.listed) {
    try {
      const cached = await readCachedThumbnail(fileId, version, known.link)
      if (cached) return image(cached)
    } catch {
      // A missing thumbnail is not cached. Fall through to the checked fetch.
    }
  }

  try {
    const thumbnail = await thumbnailClientFile(folder.id, fileId)
    if (!thumbnail) return placeholder()
    return new Response(thumbnail.body, { headers: imageHeaders(thumbnail.mimeType) })
  } catch {
    return placeholder()
  }
}

function readCachedThumbnail(fileId: string, version: string, link: string | null): Promise<CachedThumb | null> {
  return unstable_cache(
    async () => {
      const image = link ? await gridThumbnailFromLink(link) : await thumbnailForKnownFile(fileId)
      if (!image) throw new Error('no-thumb')
      const bytes = Buffer.from(await new Response(image.body).arrayBuffer())
      if (bytes.byteLength === 0) throw new Error('no-thumb')
      return { mimeType: image.mimeType, base64: bytes.toString('base64') }
    },
    ['drive-thumb-v1', fileId, version],
    { revalidate: THUMB_CACHE_SECONDS, tags: [thumbnailTag(fileId)] },
  )()
}

function image(cached: CachedThumb): Response {
  const bytes = Buffer.from(cached.base64, 'base64')
  return new Response(new Uint8Array(bytes), { headers: imageHeaders(cached.mimeType) })
}

function imageHeaders(mimeType: string): HeadersInit {
  return {
    'Content-Type': mimeType,
    'Cache-Control': 'private, max-age=86400, stale-while-revalidate=604800',
  }
}

function placeholder(): Response {
  return new Response(placeholderBytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
    },
  })
}
