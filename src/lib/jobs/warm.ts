import 'server-only'
import { gridThumbnailFromLink, thumbnailForKnownFile } from '@/lib/drive/client'
import { readLibraryIndex, readStoredThumb, writeStoredThumb } from '@/lib/library-index/store'
import { enqueueJob } from '@/lib/jobs/queue'

const WARM_BATCH = 40
const MAX_THUMB_BYTES = 400_000

export async function warmFolderThumbnails(folderId: string, uid: string): Promise<void> {
  const indexed = await readLibraryIndex(folderId)
  if (!indexed) return
  let warmed = 0
  for (const fileId of indexed.snapshot.fileIds) {
    if (await readStoredThumb(folderId, fileId)) continue
    if (warmed >= WARM_BATCH) {
      await enqueueJob({ kind: 'warm-thumbnails', folderId, uid })
      return
    }
    const link = indexed.snapshot.thumbs[fileId] ?? null
    const image = link ? await gridThumbnailFromLink(link) : await thumbnailForKnownFile(fileId)
    if (!image) continue
    const bytes = Buffer.from(await new Response(image.body).arrayBuffer())
    if (bytes.byteLength === 0 || bytes.byteLength > MAX_THUMB_BYTES) continue
    await writeStoredThumb(folderId, fileId, { mimeType: image.mimeType, base64: bytes.toString('base64') })
    warmed += 1
  }
}
