import 'server-only'
import type { Collection, MediaItem, Orientation } from '@/data/types'
import { listClientFolder, type DriveCollectionFolder, type DrivePlacedFile } from './client'
import { readCollectionRecords, type CollectionRecord } from './publish'
import { driveFolderForUser } from './resolve'
import { readAssetCopy } from './tags'

export async function loadDriveLibrary(
  userId: string,
  email: string | null | undefined,
  driveFolderId: string | null,
): Promise<{ items: MediaItem[]; collections: Collection[]; folderName: string | null; hasFolder: boolean }> {
  const folder = await driveFolderForUser(userId, email, driveFolderId)
  if (!folder) return { items: [], collections: [], folderName: null, hasFolder: false }
  const listed = await listClientFolder(folder.id)
  const records = await readCollectionRecords(listed.collections.map((entry) => entry.id))
  const hidden = new Set([...records].filter(([, record]) => !record.published).map(([id]) => id))
  const collections = listed.collections.filter((entry) => !hidden.has(entry.id))
  const files = listed.files.filter((file) => !file.collectionId || !hidden.has(file.collectionId))
  const copy = await readAssetCopy(files.map((file) => file.id))
  return {
    items: files.map((file) => toMediaItem(file, file.collectionName ?? '', copy.get(file.id))),
    collections: collections.map((entry) => toCollection(entry, files, records.get(entry.id))),
    folderName: folder.name,
    hasFolder: true,
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
    cover: ids.slice(0, 9),
    published: true,
  }
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

function toMediaItem(
  file: DrivePlacedFile,
  collection: string,
  copy: { tags: string[]; suggestedUse: string } | undefined,
): MediaItem {
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
    src: `/api/drive/files/${file.id}/thumbnail`,
    channel: tags[0] ?? '',
    tags,
    orientation: orientationFor(type, file.width, file.height),
    collection,
    position: '50% 50%',
    description: copy?.suggestedUse ?? '',
    driveFileId: file.id,
  }
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
