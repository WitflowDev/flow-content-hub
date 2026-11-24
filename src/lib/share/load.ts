import 'server-only'
import { formatVariantId } from '@/data/exports'
import { listContainedMedia, readContainedFolder } from '@/lib/drive/client'
import { readCollectionRecords } from '@/lib/drive/publish'
import { readAssetCopy } from '@/lib/drive/tags'
import { embargoActive } from '@/lib/press'
import { readShare } from '@/lib/share/store'
import type { SharedCollectionView } from '@/lib/share/types'

export async function loadSharedCollection(token: string): Promise<SharedCollectionView | null> {
  const share = await readShare(token)
  if (!share) return null
  const folder = await readContainedFolder(share.folderId)
  if (!folder) return null
  const listed = (await listContainedMedia(share.folderId)).filter((file) => !formatVariantId(file.name))
  const copy = await readAssetCopy(listed.map((file) => file.id))
  const record = (await readCollectionRecords([share.folderId])).get(share.folderId)
  const visible = listed.filter((file) => !embargoActive(copy.get(file.id)?.press.embargoUntil ?? ''))
  const ids = new Set(visible.map((file) => file.id))
  const files = [...visible]
    .sort((left, right) => (right.modifiedTime ?? '').localeCompare(left.modifiedTime ?? ''))
    .map((file) => ({
      id: file.id,
      title: titleFromName(file.name),
      fileName: file.name,
      type: file.mimeType.startsWith('video/') ? ('Video' as const) : ('Photography' as const),
      description: copy.get(file.id)?.suggestedUse ?? '',
    }))
  return {
    title: folder.name,
    description: record?.description ?? '',
    date: formatDate(folder.modifiedTime),
    files,
    maps: (record?.maps ?? [])
      .map((map) => ({ description: map.description, fileIds: map.fileIds.filter((id) => ids.has(id)) }))
      .filter((map) => map.fileIds.length >= 2),
  }
}

function titleFromName(name: string): string {
  const extension = name.lastIndexOf('.')
  const title = extension > 0 ? name.slice(0, extension) : name
  return title.replaceAll('_', ' ').trim() || name
}

function formatDate(value: string): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }).format(date)
}
