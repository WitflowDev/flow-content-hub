import type { MediaItem } from '@/data/types'

type Notify = (message: string, type?: '' | 'success') => void

export function downloadDriveFiles(items: readonly MediaItem[], notify?: Notify): void {
  const files = items.flatMap((item) => {
    const driveFileId = item.driveFileId
    if (typeof driveFileId !== 'string' || driveFileId.length === 0) return []
    return [{ driveFileId, name: item.file, collection: item.collection }]
  })
  if (files.length === 0) return
  if (files.length === 1) {
    clickDownload(`/api/drive/files/${files[0].driveFileId}`, files[0].name)
    return
  }
  void packDownload(files, notify)
}

export function downloadNamedFile(href: string, name: string): void {
  clickDownload(href, name)
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  clickDownload(url, name)
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

function clickDownload(href: string, name: string): void {
  const link = document.createElement('a')
  link.href = href
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
}

async function packDownload(
  files: readonly { driveFileId: string; name: string; collection: string }[],
  notify?: Notify,
): Promise<void> {
  notify?.('Preparing the download…')
  const response = await fetch('/api/drive/zips', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileIds: files.map((file) => file.driveFileId), collectionId: files[0]?.collection ?? '' }),
  })
  const created: unknown = await response.json().catch(() => null)
  const jobId = created && typeof created === 'object' && 'jobId' in created && typeof created.jobId === 'string' ? created.jobId : ''
  if (!response.ok || !jobId) {
    notify?.('The download could not be prepared.')
    return
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await wait(2000)
    const status = await fetch(`/api/drive/zips/${jobId}`)
    if (status.status === 202) continue
    if (!status.ok) {
      notify?.('The download could not be prepared.')
      return
    }
    const blob = await status.blob()
    const url = URL.createObjectURL(blob)
    clickDownload(url, 'collection.zip')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    notify?.('Download ready.', 'success')
    return
  }
  notify?.('The download is still preparing.')
}

export function downloadPressKit(fileId: string, notify?: Notify): void {
  void packPressKit(fileId, notify)
}

async function packPressKit(fileId: string, notify?: Notify): Promise<void> {
  notify?.('Preparing the press kit…')
  const response = await fetch('/api/drive/press-kit', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ fileId }),
  })
  const created: unknown = await response.json().catch(() => null)
  const jobId = created && typeof created === 'object' && 'jobId' in created && typeof created.jobId === 'string' ? created.jobId : ''
  const message = created && typeof created === 'object' && 'message' in created && typeof created.message === 'string' ? created.message : ''
  if (!response.ok || !jobId) {
    notify?.(message || 'The press kit could not be prepared.')
    return
  }
  for (let attempt = 0; attempt < 40; attempt += 1) {
    await wait(2000)
    const status = await fetch(`/api/drive/zips/${jobId}`)
    if (status.status === 202) continue
    if (!status.ok) {
      notify?.('The press kit could not be prepared.')
      return
    }
    const blob = await status.blob()
    const url = URL.createObjectURL(blob)
    clickDownload(url, 'press-kit.zip')
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
    notify?.('Press kit ready.', 'success')
    return
  }
  notify?.('The press kit is still preparing.')
}

function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}
