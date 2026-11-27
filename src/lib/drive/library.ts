import 'server-only'
import { after } from 'next/server'
import { formatVariantId } from '@/data/exports'
import type { Collection, MediaItem, Orientation } from '@/data/types'
import { drainJob } from '@/lib/jobs/loop'
import { enqueueJob } from '@/lib/jobs/queue'
import { readLibraryIndex, writeLibraryIndex } from '@/lib/library-index/store'
import { recordMetric } from '@/lib/observe'
import { embargoActive } from '@/lib/press'
import { readPreviewTarget } from '@/lib/preview'
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

export type ListedThumb =
  | { status: 'unindexed'; listed: false }
  | { status: 'hidden'; listed: false }
  | { status: 'visible'; listed: true; link: string | null; version: string }

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
  if (!fresh) {
    const jobId = await enqueueJob({ kind: 'sync-library', folderId: folder.id, uid: userId })
    scheduleDrain(jobId)
  }
  if (!indexed) {
    recordMetric('library.index.miss')
    return { items: [], collections: [], folderName: folder.name, hasFolder: true, preparing: true }
  }
  recordMetric('library.index.hit')
  const projected = cachedProjection(indexed.snapshot, indexed.syncedAt, includeDrafts)
  return { items: projected.items, collections: projected.collections, folderName: folder.name, hasFolder: true, preparing: false }
}

export async function syncLibraryFolder(folderId: string): Promise<void> {
  const snapshot = await buildSnapshot(folderId, true)
  await writeLibraryIndex(folderId, snapshot)
}

function scheduleDrain(jobId: string): void {
  try {
    after(async () => {
      await drainJob(jobId)
    })
  } catch {
    // Outside a Next.js request context (e.g., background worker or tests), the job queue handles it.
  }
}

export async function adminLibraryThumbMeta(
  folderId: string,
  fileId: string,
): Promise<{ link: string | null; version: string } | null> {
  const indexed = await readLibraryIndex(folderId)
  if (!indexed) return null
  const projected = cachedProjection(indexed.snapshot, indexed.syncedAt, true)
  return projected.fileMeta.get(fileId) ?? null
}

export async function sharedCollectionThumbMeta(
  clientFolderId: string,
  collectionFolderId: string,
  fileId: string,
): Promise<{ link: string | null; version: string } | null> {
  const indexed = await readLibraryIndex(clientFolderId)
  if (!indexed) return null
  const projected = cachedProjection(indexed.snapshot, indexed.syncedAt, false)
  const item = projected.itemByFileId.get(fileId)
  if (!item || item.collectionId !== collectionFolderId) return null
  return projected.fileMeta.get(fileId) ?? null
}

export async function libraryThumb(folderId: string, fileId: string): Promise<ListedThumb> {
  const includeDrafts = (await readPreviewTarget()) !== null
  const indexed = await readLibraryIndex(folderId)
  if (!indexed) return { status: 'unindexed', listed: false }
  const projected = cachedProjection(indexed.snapshot, indexed.syncedAt, includeDrafts)
  const meta = projected.fileMeta.get(fileId)
  if (!meta) return { status: 'hidden', listed: false }
  return {
    status: 'visible',
    listed: true,
    link: meta.link,
    version: meta.version,
  }
}

export async function readVisibleLibraryItem(folderId: string, fileId: string): Promise<MediaItem | null> {
  const includeDrafts = (await readPreviewTarget()) !== null
  const indexed = await readLibraryIndex(folderId)
  if (!indexed) return null
  const projected = cachedProjection(indexed.snapshot, indexed.syncedAt, includeDrafts)
  return projected.itemByFileId.get(fileId) ?? null
}

export async function filterVisibleFileIds(folderId: string, fileIds: readonly string[]): Promise<string[] | null> {
  const includeDrafts = (await readPreviewTarget()) !== null
  const indexed = await readLibraryIndex(folderId)
  if (!indexed) return null
  const projected = cachedProjection(indexed.snapshot, indexed.syncedAt, includeDrafts)
  return fileIds.filter((id) => projected.fileMeta.has(id))
}

type ProjectedIndex = {
  dayKey: string
  items: MediaItem[]
  collections: Collection[]
  fileIds: string[]
  itemByFileId: Map<string, MediaItem>
  fileMeta: Map<string, { link: string | null; version: string }>
}

const projectionMemo = new WeakMap<LibrarySnapshot, { drafts?: ProjectedIndex; published?: ProjectedIndex }>()

function cachedProjection(snapshot: LibrarySnapshot, syncedAt: number, includeDrafts: boolean): ProjectedIndex {
  const dayKey = new Date().toISOString().slice(0, 10)
  const bucket = projectionMemo.get(snapshot) ?? {}
  const existing = includeDrafts ? bucket.drafts : bucket.published
  if (existing && existing.dayKey === dayKey) return existing

  const projected = projectSnapshot(snapshot, includeDrafts)
  const itemByFileId = new Map<string, MediaItem>()
  const versionByFileId = new Map<string, string>()
  const fallback = String(syncedAt)

  for (const item of projected.items) {
    const version = extractVersion(item.src, fallback)
    if (item.driveFileId) {
      itemByFileId.set(item.driveFileId, item)
      versionByFileId.set(item.driveFileId, version)
    }
    if (item.variants) {
      for (const variant of Object.values(item.variants)) {
        if (variant?.fileId) versionByFileId.set(variant.fileId, version)
      }
    }
    if (item.customVariants) {
      for (const variant of item.customVariants) {
        if (variant.fileId) versionByFileId.set(variant.fileId, version)
      }
    }
  }

  const fileMeta = new Map<string, { link: string | null; version: string }>()
  for (const id of projected.fileIds) {
    fileMeta.set(id, {
      link: snapshot.thumbs[id] ?? null,
      version: versionByFileId.get(id) ?? fallback,
    })
  }

  const entry: ProjectedIndex = {
    dayKey,
    items: projected.items,
    collections: projected.collections,
    fileIds: projected.fileIds,
    itemByFileId,
    fileMeta,
  }
  if (includeDrafts) bucket.drafts = entry
  else bucket.published = entry
  projectionMemo.set(snapshot, bucket)
  return entry
}

function extractVersion(src: string | undefined, fallback: string): string {
  if (!src) return fallback
  const query = src.split('?')[1]
  if (!query) return fallback
  return new URLSearchParams(query).get('v') || fallback
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
  const collectionIds = new Set(collections.map((collection) => collection.slug))
  const titles = new Set(collections.map((collection) => collection.title))
  const items = snapshot.items.filter((item) => {
    if (embargoActive(item.embargoUntil ?? '')) return false
    if (item.collectionId !== undefined) {
      return item.collectionId === '' || collectionIds.has(item.collectionId)
    }
    return item.collection === '' || titles.has(item.collection)
  })
  const visible = new Set<string>()
  for (const item of items) {
    if (item.driveFileId) visible.add(item.driveFileId)
    if (item.variants) {
      for (const variant of Object.values(item.variants)) {
        if (variant?.fileId) visible.add(variant.fileId)
      }
    }
    if (item.customVariants) {
      for (const variant of item.customVariants) {
        if (variant.fileId) visible.add(variant.fileId)
      }
    }
  }
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
    collectionId: file.collectionId ?? '',
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
