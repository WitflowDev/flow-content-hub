import { formatVariantId } from '@/data/exports'
import { listContainedMedia, prepareClientZipEntries, readContainedFolder } from '@/lib/drive/client'
import { readAssetCopy } from '@/lib/drive/tags'
import { contentDisposition } from '@/lib/http/disposition'
import { embargoActive } from '@/lib/press'
import { sharedFolderId } from '@/lib/share/media'
import { createZipStream } from '@/lib/zipStream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_SHARED_ZIP_FILES = 150

type RouteContext = { params: Promise<{ token: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { token } = await context.params
  const folderId = await sharedFolderId(token)
  if (!folderId) return new Response('Not found', { status: 404 })

  try {
    const [folder, listed] = await Promise.all([readContainedFolder(folderId), listContainedMedia(folderId)])
    if (!folder) return new Response('Not found', { status: 404 })

    const visibleFiles = listed.filter((file) => !formatVariantId(file.name))
    const copy = await readAssetCopy(visibleFiles.map((file) => file.id))
    const allowedIds = visibleFiles
      .filter((file) => !embargoActive(copy.get(file.id)?.press.embargoUntil ?? ''))
      .slice(0, MAX_SHARED_ZIP_FILES)
      .map((file) => file.id)

    if (allowedIds.length === 0) return new Response('Not found', { status: 404 })

    const entries = await prepareClientZipEntries(folderId, allowedIds)
    if (entries.length === 0) return new Response('Not found', { status: 404 })

    const cleanedTitle = folder.name
      .replace(/[\r\n"/\\:*?<>|]+/g, ' ')
      .replace(/\s+/g, '_')
      .replace(/^_+|_+$/g, '')
      .slice(0, 80)
    const archiveName = `${cleanedTitle || 'Shared_Collection'}.zip`

    const stream = createZipStream(entries)
    return new Response(stream, {
      headers: {
        'Content-Type': 'application/zip',
        'Content-Disposition': contentDisposition(archiveName, false),
        'Cache-Control': 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
