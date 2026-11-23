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
    label: 'Post',
    note: 'Best fit for a feed post.',
    width: 1080,
    height: 1350,
  },
  {
    id: 'story',
    label: 'Story',
    note: 'Best fit for a story.',
    width: 1080,
    height: 1920,
  },
  {
    id: 'facebook-banner',
    label: 'Banner',
    note: 'Best fit for a cover or a wide banner.',
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

export function isCustomFormatId(id: string): boolean {
  return /^custom-[a-z0-9-]{1,32}$/.test(id)
}

export function customFormatId(label: string, index: number): string {
  const slug = label
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 16)
  return `custom-${slug || 'format'}-${index + 1}`
}

export function variantFileName(fileName: string, formatId: string): string {
  const safeId = formatId.toLowerCase().replace(/[^a-z0-9-]/g, '').slice(0, 40)
  const dot = fileName.lastIndexOf('.')
  const extension = dot > 0 ? fileName.slice(dot) : ''
  const base = (dot > 0 ? fileName.slice(0, dot) : fileName).replace(/__flowsize__[a-z0-9-]+$/i, '')
  const suffix = `${VARIANT_MARK}${safeId}${extension}`
  const room = 180 - suffix.length
  return `${base.slice(0, Math.max(1, room))}${suffix}`
}

export function formatVariantId(fileName: string): string | null {
  const match = /__flowsize__([a-z0-9-]{1,40})(?:\.[^.]+)?$/i.exec(fileName)
  const id = match?.[1]?.toLowerCase()
  if (!id) return null
  const known = exportFormat(id)
  if (known) return known.id
  if (isCustomFormatId(id)) return id
  return null
}

export type CropFrame = {
  x: number
  y: number
  zoom: number
}

export const CENTER_CROP: CropFrame = { x: 0.5, y: 0.5, zoom: 1 }

export function coverPlacement(
  imageWidth: number,
  imageHeight: number,
  frameWidth: number,
  frameHeight: number,
  frame: CropFrame,
): { x: number; y: number; width: number; height: number } {
  const zoom = Math.min(3, Math.max(1, frame.zoom))
  const scale = Math.max(frameWidth / imageWidth, frameHeight / imageHeight) * zoom
  const width = imageWidth * scale
  const height = imageHeight * scale
  const minX = frameWidth / (2 * width)
  const maxX = 1 - minX
  const minY = frameHeight / (2 * height)
  const maxY = 1 - minY
  const focalX = Math.min(maxX, Math.max(minX, frame.x))
  const focalY = Math.min(maxY, Math.max(minY, frame.y))
  return {
    x: frameWidth / 2 - focalX * width,
    y: frameHeight / 2 - focalY * height,
    width,
    height,
  }
}

export function renderCrop(src: string, width: number, height: number, frame: CropFrame): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      const context = canvas.getContext('2d')
      if (!context || image.naturalWidth === 0 || image.naturalHeight === 0) {
        reject(new Error('The crop could not be prepared.'))
        return
      }
      const place = coverPlacement(image.naturalWidth, image.naturalHeight, width, height, frame)
      context.drawImage(image, place.x, place.y, place.width, place.height)
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error('The crop could not be prepared.'))
            return
          }
          resolve(blob)
        },
        'image/jpeg',
        0.92,
      )
    }
    image.onerror = () => reject(new Error('The photo could not be prepared.'))
    image.src = src
  })
}

export function cropToFormat(src: string, width: number, height: number): Promise<string> {
  return renderCrop(src, width, height, CENTER_CROP).then((blob) => URL.createObjectURL(blob))
}
