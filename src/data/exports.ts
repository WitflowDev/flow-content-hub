export const EXPORT_IDS = ['instagram-post', 'story', 'facebook-banner'] as const

export type ExportId = (typeof EXPORT_IDS)[number]

export type ExportFormat = {
  id: ExportId
  label: string
  note: string
  width: number
  height: number
}

export const EXPORT_FORMATS: readonly ExportFormat[] = [
  {
    id: 'instagram-post',
    label: 'Instagram post',
    note: 'Best fit for an Instagram feed post.',
    width: 1080,
    height: 1350,
  },
  {
    id: 'story',
    label: 'Story',
    note: 'Best fit for an Instagram or Facebook story.',
    width: 1080,
    height: 1920,
  },
  {
    id: 'facebook-banner',
    label: 'Facebook banner',
    note: 'Best fit for a Facebook cover.',
    width: 1640,
    height: 624,
  },
]

export function exportFormat(id: string): ExportFormat | null {
  switch (id) {
    case 'instagram-post':
    case 'story':
    case 'facebook-banner':
      return EXPORT_FORMATS.find((format) => format.id === id) ?? null
    default:
      return null
  }
}

export function parseExportIds(value: unknown): ExportId[] {
  if (!Array.isArray(value)) return []
  const ids: ExportId[] = []
  for (const item of value) {
    if (typeof item !== 'string') continue
    const format = exportFormat(item)
    if (!format || ids.includes(format.id)) continue
    ids.push(format.id)
  }
  return ids
}

const VARIANT_MARK = '__flowsize__'

export function variantFileName(fileName: string, formatId: ExportId): string {
  const dot = fileName.lastIndexOf('.')
  const extension = dot > 0 ? fileName.slice(dot) : ''
  const base = (dot > 0 ? fileName.slice(0, dot) : fileName).replace(/__flowsize__[a-z-]+$/i, '')
  const suffix = `${VARIANT_MARK}${formatId}${extension}`
  const room = 180 - suffix.length
  return `${base.slice(0, Math.max(1, room))}${suffix}`
}

export function formatVariantId(fileName: string): ExportId | null {
  const match = /__flowsize__(instagram-post|story|facebook-banner)(?:\.[^.]+)?$/i.exec(fileName)
  const id = match?.[1]?.toLowerCase()
  if (!id) return null
  return exportFormat(id)?.id ?? null
}

export function cropToFormat(src: string, width: number, height: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context) {
        reject(new Error('The crop could not be prepared.'))
        return
      }
      const scale = Math.max(width / image.naturalWidth, height / image.naturalHeight)
      const drawWidth = image.naturalWidth * scale
      const drawHeight = image.naturalHeight * scale
      context.drawImage(image, (width - drawWidth) / 2, (height - drawHeight) / 2, drawWidth, drawHeight)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('The crop could not be prepared.'))
            return
          }
          resolve(URL.createObjectURL(blob))
        },
        'image/jpeg',
        0.92,
      )
    }
    image.onerror = () => reject(new Error('The photo could not be prepared.'))
    image.src = src
  })
}
