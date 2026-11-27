import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { after } from 'next/server'
import { gridThumbnailFromLink, isDriveFileId, readFolderName, thumbnailClientFile, thumbnailForKnownFile } from '@/lib/drive/client'
import { adminLibraryThumbMeta } from '@/lib/drive/library'
import { isOwnedClientFolder, requireFastAdmin } from '@/lib/auth/admin'
import { readStoredThumb, writeStoredThumb } from '@/lib/library-index/store'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const placeholderBytes = readFileSync(join(process.cwd(), 'public', 'assets', 'flow-logo-black.png'))
const MAX_STORED_THUMB_BYTES = 400_000

type RouteContext = {
  params: Promise<{ fileId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const admin = await requireFastAdmin()
  if (!admin) return new Response('Not found', { status: 404 })

  const { fileId } = await context.params
  const folderId = new URL(request.url).searchParams.get('folder') ?? ''
  if (!isDriveFileId(fileId) || !isDriveFileId(folderId)) return placeholder()

  if (!(await isOwnedClientFolder(folderId))) return placeholder()

  const meta = await adminLibraryThumbMeta(folderId, fileId)
  const etag = meta ? `W/"admin-thumb-${fileId}-${meta.version}"` : ''
  if (etag && matchesEtag(request.headers.get('if-none-match'), etag)) {
    return new Response(null, {
      status: 304,
      headers: { ETag: etag, 'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400' },
    })
  }

  const stored = await readStoredThumb(folderId, fileId)
  if (stored) {
    const bytes = Buffer.from(stored.base64, 'base64')
    return new Response(new Uint8Array(bytes), { headers: imageHeaders(stored.mimeType, etag) })
  }

  try {
    let thumbnail: { mimeType: string; body: ReadableStream<Uint8Array> } | null = null
    if (meta) {
      thumbnail = meta.link ? await gridThumbnailFromLink(meta.link) : null
      if (!thumbnail) thumbnail = await thumbnailForKnownFile(fileId)
    } else {
      await readFolderName(folderId)
      thumbnail = await thumbnailClientFile(folderId, fileId, false)
    }
    if (!thumbnail) return placeholder()
    const bytes = Buffer.from(await new Response(thumbnail.body).arrayBuffer())
    if (bytes.byteLength === 0) return placeholder()
    if (bytes.byteLength <= MAX_STORED_THUMB_BYTES) {
      const mimeType = thumbnail.mimeType
      const base64 = bytes.toString('base64')
      after(async () => {
        await writeStoredThumb(folderId, fileId, { mimeType, base64 }).catch(() => undefined)
      })
    }
    return new Response(new Uint8Array(bytes), { headers: imageHeaders(thumbnail.mimeType, etag) })
  } catch {
    return placeholder()
  }
}

function imageHeaders(mimeType: string, etag: string): HeadersInit {
  return {
    'Content-Type': mimeType,
    ...(etag ? { ETag: etag } : {}),
    'Cache-Control': 'private, max-age=3600, stale-while-revalidate=86400',
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
