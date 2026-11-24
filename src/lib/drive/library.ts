import 'server-only'
import { formatVariantId } from '@/data/exports'
import type { Collection, MediaItem, Orientation } from '@/data/types'
import { enqueueJob } from '@/lib/jobs/queue'
import { readLibraryIndex, writeLibraryIndex } from '@/lib/library-index/store'
import { recordMetric } from '@/lib/observe'
import { embargoActive } from '@/lib/press'
import { readPreviewTarget } from '@/lib/preview'
import { invalidateLibrary } from './cache'
import { listClientFolder, type DriveCollectionFolder, type DrivePlacedFile } from './client'
import { readCollectionRecords, type CollectionRecord } from './publish'
import { driveFolderForUser } from './resolve'
import { readAssetCopy, type AssetCopy } from './tags'

const INDEX_FRESH_MS = 90_000

type LibraryView = {
  items: MediaItem[]
  collections: Collection[]
  folderName: string | null
  hasFolder: boolean
  preparing: boolean
}

export type LibrarySnapshot = {
  items: MediaItem[]
  collections: Collection[]
  fileIds: string[]
  thumbs: Record<string, string>
}

export type ListedThumb = { listed: false } | { listed: true; link: string | null }

export async function loadDriveLibrary(
  userId: string,
  email: string | null | undefined,
  driveFolderId: string | null,
  includeDrafts = false,
): Promise<LibraryView> {
  const folder = await driveFolderForUser(userId, email, driveFolderId)
  if (!folder) return { items: [], collections: [], folderName: null, hasFolder: false, preparing: false }
  const indexed = await readLibraryIndex(folder.id)
  const fresh = indexed !== null && Date.now() - indexed.syncedAt < INDEX_FRESH_MS
  if (!fresh) await enqueueJob({ kind: 'sync-library', folderId: folder.id, uid: userId })
  if (!indexed) {
    recordMetric('library.index.miss')
    return { items: [], collections: [], folderName: folder.name, hasFolder: true, preparing: true }
  }
  recordMetric('library.index.hit')
  const projected = projectSnapshot(indexed.snapshot, includeDrafts)
  return { ...projected, folderName: folder.name, hasFolder: true, preparing: false }
}

export async function syncLibraryFolder(folderId: string): Promise<void> {
  const snapshot = await buildSnapshot(folderId, true)
  await writeLibraryIndex(folderId, snapshot)
  invalidateLibrary(folderId)
}

export async function libraryThumb(folderId: string, fileId: string): Promise<ListedThumb> {
  const includeDrafts = (await readPreviewTarget()) !== null
  const indexed = await readLibraryIndex(folderId)
  if (!indexed) return { listed: false }
  const projected = projectSnapshot(indexed.snapshot, includeDrafts)
  if (!projected.fileIds.includes(fileId)) return { listed: false }
  return { listed: true, link: indexed.snapshot.thumbs[fileId] ?? null }
}

function projectSnapshot(snapshot: LibrarySnapshot, includeDrafts: boolean): {
  items: MediaItem[]
  collections: Collection[]
  fileIds: string[]
} {
  if (includeDrafts) {
    return { items: snapshot.items, collections: snapshot.collections, fileIds: snapshot.fileIds }
  }
  const collections = snapshot.collections.filter((collection) => collection.published !== false)
  const titles = new Set(collections.map((collection) => collection.title))
  const items = snapshot.items.filter(
    (item) => (item.collection === '' || titles.has(item.collection)) && !embargoActive(item.embargoUntil ?? ''),
  )
  const visible = new Set(items.flatMap((item) => (item.driveFileId ? [item.driveFileId] : [])))
  return {
    items,
    collections,
    fileIds: snapshot.fileIds.filter((fileId) => visible.has(fileId)),
  }
}

async function buildSnapshot(folderId: string, includeDrafts: boolean): Promise<LibrarySnapshot> {
  const listed = await listClientFolder(folderId)
  const records = await readCollectionRecords(listed.collections.map((entry) => entry.id))
  const hidden = includeDrafts
    ? new Set<string>()
    : new Set([...records].filter(([, record]) => !record.published).map(([id]) => id))
  const collections = listed.collections.filter((entry) => !hidden.has(entry.id))
  const files = listed.files.filter((file) => !file.collectionId || !hidden.has(file.collectionId))
  const visible = files.filter((file) => !formatVariantId(file.name))
  const copy = await readAssetCopy(visible.map((file) => file.id))
  const thumbs: Record<string, string> = {}
  for (const file of files) {
    if (file.thumbnailLink) thumbs[file.id] = file.thumbnailLink
  }
  return {
    items: visible.map((file) => toMediaItem(file, file.collectionName ?? '', copy.get(file.id))),
    collections: collections.map((entry) => toCollection(entry, visible, records.get(entry.id))),
    fileIds: files.map((file) => file.id),
    thumbs,
  }
}

function toCollection(folder: DriveCollectionFolder, files: DrivePlacedFile[], record: CollectionRecord | undefined): Collection {
  const members = files
    .filter((file) => file.collectionId === folder.id)
    .sort((left, right) => (right.modifiedTime ?? '').localeCompare(left.modifiedTime ?? ''))
  const ids = members.map((file) => `drive-${file.id}`)
  return {
    slug: folder.id,
    title: folder.name,
    count: ids.length,
    date: formatCollectionDate(folder.modifiedTime ?? members[0]?.modifiedTime),
    updatedAt: folder.modifiedTime ?? members[0]?.modifiedTime ?? '',
    description: record?.description ?? '',
    tags: record?.tags ?? [],
    maps: record?.maps ?? [],
    ids,
    cover: chosenCover(ids, record?.coverFileId ?? ''),
    published: record ? record.published : true,
  }
}

function chosenCover(ids: string[], coverFileId: string): string[] {
  const chosen = coverFileId ? `drive-${coverFileId}` : ''
  if (chosen && ids.includes(chosen)) return [chosen]
  return ids.slice(0, 9)
}

function formatCollectionDate(value: string | undefined): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function toMediaItem(file: DrivePlacedFile, collection: string, copy: AssetCopy | undefined): MediaItem {
  const type = file.mimeType.startsWith('video/') ? 'Video' : 'Photography'
  const duration = type === 'Video' ? formatDuration(file.durationMillis) : undefined
  const tags = copy?.tags ?? []
  return {
    id: `drive-${file.id}`,
    title: titleFromName(file.name),
    type,
    file: file.name,
    size: formatSize(file.size),
    duration,
    src: `/api/drive/files/${file.id}/thumbnail?v=${encodeURIComponent(file.modifiedTime ?? '0')}`,
    channel: tags[0] ?? '',
    tags,
    orientation: orientationFor(type, file.width, file.height),
    collection,
    position: '50% 50%',
    description: copy?.suggestedUse ?? '',
    driveFileId: file.id,
    bytes: byteCount(file.size),
    exports: type === 'Photography' ? (copy?.exports ?? []) : [],
    variants: type === 'Photography' ? copy?.variants : undefined,
    customVariants: type === 'Photography' && copy && copy.customVariants.length > 0 ? copy.customVariants : undefined,
    crops: type === 'Photography' && copy && Object.keys(copy.crops).length > 0 ? copy.crops : undefined,
    customCrops: type === 'Photography' && copy && copy.customCrops.length > 0 ? copy.customCrops : undefined,
    year: yearOf(file.modifiedTime),
    credit: copy?.press.credit ?? '',
    license: copy?.press.license ?? '',
    captionApproved: copy?.press.captionApproved ?? false,
    embargoUntil: copy?.press.embargoUntil ?? '',
  }
}

function yearOf(modified: string | undefined): number | undefined {
  if (!modified) return undefined
  const year = Number(modified.slice(0, 4))
  if (!Number.isInteger(year) || year < 1990 || year > 2100) return undefined
  return year
}

function byteCount(size: string | undefined): number | undefined {
  const bytes = Number(size)
  if (!Number.isFinite(bytes) || bytes <= 0) return undefined
  return bytes
}

function titleFromName(name: string): string {
  const extension = name.lastIndexOf('.')
  const title = extension > 0 ? name.slice(0, extension) : name
  return title.replaceAll('_', ' ').trim() || name
}

function formatSize(size: string | undefined): string {
  const bytes = Number(size)
  if (!Number.isFinite(bytes) || bytes <= 0) return 'Unknown size'
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function formatDuration(durationMillis: string | undefined): string | undefined {
  const millis = Number(durationMillis)
  if (!Number.isFinite(millis) || millis <= 0) return undefined
  const total = Math.round(millis / 1000)
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${seconds.toString().padStart(2, '0')}`
}

function orientationFor(type: 'Video' | 'Photography', width: number | undefined, height: number | undefined): Orientation {
  if (!width || !height) return 'Landscape'
  const ratio = width / height
  if (ratio > 1.15) return 'Landscape'
  if (ratio < 0.87) return type === 'Video' ? 'Vertical' : 'Portrait'
  return 'Square'
}
