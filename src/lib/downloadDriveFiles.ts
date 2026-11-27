import type { MediaItem } from '@/data/types'

type Notify = (message: string, type?: '' | 'success') => void

export function downloadDriveFiles(items: readonly MediaItem[], notify?: Notify, archiveName?: string): void {
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

  // Native form POST streams the ZIP straight to disk with the browser's download bar (0 MB buffered in JS RAM).
  notify?.('Starting ZIP download…', 'success')
  const form = document.createElement('form')
  form.method = 'POST'
  form.action = '/api/drive/download-zip'
  form.style.display = 'none'

  const label = archiveName || files[0]?.collection || 'Flow_Content'
  const nameField = document.createElement('input')
  nameField.type = 'hidden'
  nameField.name = 'name'
  nameField.value = label
  form.appendChild(nameField)

  for (const file of files) {
    const idField = document.createElement('input')
    idField.type = 'hidden'
    idField.name = 'fileId'
    idField.value = file.driveFileId
    form.appendChild(idField)
  }

  document.body.appendChild(form)
  form.submit()
  form.remove()
}

export function downloadNamedFile(href: string, name: string): void {
  clickDownload(href, name)
}

export function downloadBlob(blob: Blob, name: string): void {
  const url = URL.createObjectURL(blob)
  clickDownload(url, name)
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
}

export function downloadPressKit(fileId: string, notify?: Notify): void {
  if (!fileId) return
  notify?.('Starting press kit download…', 'success')
  clickDownload(`/api/drive/press-kit?fileId=${encodeURIComponent(fileId)}`, 'press-kit.zip')
}

function clickDownload(href: string, name: string): void {
  const link = document.createElement('a')
  link.href = href
  link.download = name
  document.body.appendChild(link)
  link.click()
  link.remove()
}
