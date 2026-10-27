import 'server-only'
import type { MediaItem, Orientation } from '@/data/types'
import { listFolderMedia, type DriveListedFile } from './client'
import { driveFolderForUser } from './resolve'

export async function loadDriveLibrary(
  userId: string,
  email: string | null | undefined,
): Promise<{ items: MediaItem[]; folderName: string | null; hasFolder: boolean }> {
  const folder = await driveFolderForUser(userId, email)
  if (!folder) return { items: [], folderName: null, hasFolder: false }
  const files = await listFolderMedia(folder.id)
  return {
    items: files.map((file) => toMediaItem(file, folder.name)),
    folderName: folder.name,
    hasFolder: true,
  }
}

function toMediaItem(file: DriveListedFile, collection: string): MediaItem {
  const type = file.mimeType.startsWith('video/') ? 'Video' : 'Photography'
  const duration = type === 'Video' ? formatDuration(file.durationMillis) : undefined
  return {
    id: `drive-${file.id}`,
    title: titleFromName(file.name),
    type,
    file: file.name,
    size: formatSize(file.size),
    duration,
    src: `/api/drive/files/${file.id}/thumbnail`,
    channel: 'Design',
    orientation: orientationFor(type, file.width, file.height),
    collection,
    position: '50% 50%',
    description: `Delivered in the ${collection} folder.`,
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
