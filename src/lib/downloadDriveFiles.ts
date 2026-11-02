import type { MediaItem } from '@/data/types'

export function downloadDriveFiles(items: readonly MediaItem[]): void {
  const files = items.flatMap((item) => {
    const driveFileId = item.driveFileId
    if (typeof driveFileId !== 'string' || driveFileId.length === 0) return []
    return [{ driveFileId, name: item.file }]
  })
  if (files.length === 0) return
  for (const file of files) {
    const link = document.createElement('a')
    link.href = `/api/drive/files/${file.driveFileId}`
    link.download = file.name
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}
