import 'server-only'
import { gridThumbnailFromLink, thumbnailForKnownFile } from '@/lib/drive/client'
import { listStoredThumbIds, markSkippedThumb, readLibraryIndex, writeStoredThumb } from '@/lib/library-index/store'

const WARM_BATCH = 40
const WARM_CONCURRENCY = 5
const MAX_THUMB_BYTES = 400_000

export async function warmFolderThumbnails(folderId: string): Promise<{ more: boolean }> {
  const [indexed, existingIds] = await Promise.all([readLibraryIndex(folderId), listStoredThumbIds(folderId)])
  if (!indexed) return { more: false }

  const pending = indexed.snapshot.fileIds.filter((fileId) => !existingIds.has(fileId))
  if (pending.length === 0) return { more: false }

  const batch = pending.slice(0, WARM_BATCH)
  const hasMore = pending.length > WARM_BATCH
  let cursor = 0

  const workers = Array.from({ length: Math.min(WARM_CONCURRENCY, batch.length) }, async () => {
    while (cursor < batch.length) {
      const current = cursor
      cursor += 1
      const fileId = batch[current]
      if (!fileId) continue
      const link = indexed.snapshot.thumbs[fileId] ?? null
      const image = link ? await gridThumbnailFromLink(link) : await thumbnailForKnownFile(fileId)
      if (!image) {
        await markSkippedThumb(folderId, fileId).catch(() => undefined)
        continue
      }
      const bytes = Buffer.from(await new Response(image.body).arrayBuffer())
      if (bytes.byteLength === 0 || bytes.byteLength > MAX_THUMB_BYTES) {
        await markSkippedThumb(folderId, fileId).catch(() => undefined)
        continue
      }
      await writeStoredThumb(folderId, fileId, { mimeType: image.mimeType, base64: bytes.toString('base64') }).catch(
        () => undefined,
      )
    }
  })

  await Promise.all(workers)
  return { more: hasMore }
}
