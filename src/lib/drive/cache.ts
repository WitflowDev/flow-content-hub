import 'server-only'
import { revalidateTag } from 'next/cache'

const LIBRARY_PREFIX = 'library:'
const THUMB_PREFIX = 'thumb:'
const thumbnailListeners = new Set<(fileId: string) => void>()

export function onThumbnailInvalidated(listener: (fileId: string) => void): void {
  thumbnailListeners.add(listener)
}

export function libraryTag(folderId: string): string {
  return `${LIBRARY_PREFIX}${folderId}`
}

export function thumbnailTag(fileId: string): string {
  return `${THUMB_PREFIX}${fileId}`
}

export function invalidateLibrary(folderId: string): void {
  if (!folderId) return
  revalidateTag(libraryTag(folderId), 'max')
}

export function invalidateThumbnail(fileId: string): void {
  if (!fileId) return
  revalidateTag(thumbnailTag(fileId), 'max')
  for (const listener of thumbnailListeners) listener(fileId)
}
