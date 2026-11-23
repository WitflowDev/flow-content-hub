import 'server-only'
import { isDriveFileId } from '@/lib/drive/client'
import { adminDb } from '@/lib/firebase/admin'
import { EXPORT_IDS, isCustomFormatId, parseExportIds, pixelSize, type ExportId } from '@/data/exports'
import { parseTags } from '@/lib/tags'

const READ_BATCH = 100

export type AssetVariant = {
  fileId: string
  name: string
  bytes: number
  mimeType: string
}

export type StoredCustomVariant = AssetVariant & {
  id: string
  label: string
  width?: number
  height?: number
}

export type AssetCopy = {
  tags: string[]
  suggestedUse: string
  exports: ExportId[]
  variants: Partial<Record<ExportId, AssetVariant>>
  customVariants: StoredCustomVariant[]
}

export async function readAssetCopy(fileIds: string[]): Promise<Map<string, AssetCopy>> {
  const ids = [...new Set(fileIds.filter(isDriveFileId))]
  const copy = new Map<string, AssetCopy>()
  if (ids.length === 0) return copy
  const db = adminDb()
  for (let index = 0; index < ids.length; index += READ_BATCH) {
    const slice = ids.slice(index, index + READ_BATCH)
    const snaps = await db.getAll(...slice.map((id) => db.collection('assets').doc(id)))
    for (const snap of snaps) {
      const saved = snap.get('tags')
      const tags = Array.isArray(saved)
        ? parseTags(saved.filter((tag): tag is string => typeof tag === 'string').join(', '))
        : []
      const suggestedUse = cleanUse(snap.get('suggestedUse'))
      const variants = parseVariants(snap.get('variants'))
      const customVariants = parseCustomVariants(snap.get('customVariants'))
      const savedFormats = parseExportIds(snap.get('formats'))
      const exports = EXPORT_IDS.filter((id) => savedFormats.includes(id) || variants[id])
      if (tags.length === 0 && !suggestedUse && exports.length === 0 && customVariants.length === 0) continue
      copy.set(snap.id, { tags, suggestedUse, exports, variants, customVariants })
    }
  }
  return copy
}

export async function saveAssetCopy(
  fileId: string,
  accountId: string,
  tags: string[],
  suggestedUse: string,
  formats?: ExportId[],
): Promise<void> {
  const use = cleanUse(suggestedUse)
  if (!isDriveFileId(fileId)) return
  await adminDb()
    .collection('assets')
    .doc(fileId)
    .set(
      {
        profileId: accountId,
        driveFileId: fileId,
        tags,
        suggestedUse: use,
        ...(formats ? { formats } : {}),
      },
      { merge: true },
    )
}

export async function attachAssetVariant(
  parentId: string,
  accountId: string,
  format: ExportId,
  variant: AssetVariant,
): Promise<void> {
  if (!isDriveFileId(parentId) || !isDriveFileId(variant.fileId)) return
  const ref = adminDb().collection('assets').doc(parentId)
  await adminDb().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref)
    const variants = parseVariants(snap.get('variants'))
    variants[format] = {
      fileId: variant.fileId,
      name: variant.name.slice(0, 180),
      bytes: variant.bytes,
      mimeType: variant.mimeType.slice(0, 120),
    }
    const stored: Partial<Record<ExportId, AssetVariant>> = {}
    for (const id of EXPORT_IDS) {
      const item = variants[id]
      if (item) stored[id] = item
    }
    transaction.set(
      ref,
      {
        profileId: accountId,
        driveFileId: parentId,
        variants: stored,
        formats: EXPORT_IDS.filter((id) => stored[id]),
      },
      { merge: true },
    )
  })
}

export async function attachCustomVariant(
  parentId: string,
  accountId: string,
  formatId: string,
  label: string,
  variant: AssetVariant,
  size?: { width: number; height: number },
): Promise<void> {
  if (!isDriveFileId(parentId) || !isDriveFileId(variant.fileId) || !isCustomFormatId(formatId)) return
  const name = label.trim().slice(0, 40)
  if (!name) return
  const ref = adminDb().collection('assets').doc(parentId)
  await adminDb().runTransaction(async (transaction) => {
    const snap = await transaction.get(ref)
    const current = parseCustomVariants(snap.get('customVariants')).filter((item) => item.id !== formatId)
    const width = size ? pixelSize(size.width) : null
    const height = size ? pixelSize(size.height) : null
    current.push({
      id: formatId,
      label: name,
      fileId: variant.fileId,
      name: variant.name.slice(0, 180),
      bytes: variant.bytes,
      mimeType: variant.mimeType.slice(0, 120),
      ...(width && height ? { width, height } : {}),
    })
    transaction.set(
      ref,
      {
        profileId: accountId,
        driveFileId: parentId,
        customVariants: current.slice(0, 8),
      },
      { merge: true },
    )
  })
}

export async function deleteAssetCopy(fileId: string): Promise<void> {
  if (!isDriveFileId(fileId)) return
  await adminDb().collection('assets').doc(fileId).delete()
}

function parseVariants(value: unknown): Partial<Record<ExportId, AssetVariant>> {
  if (!value || typeof value !== 'object') return {}
  const record = value as Record<string, unknown>
  const variants: Partial<Record<ExportId, AssetVariant>> = {}
  for (const id of EXPORT_IDS) {
    const variant = readVariant(record[id])
    if (variant) variants[id] = variant
  }
  return variants
}

function parseCustomVariants(value: unknown): StoredCustomVariant[] {
  if (!Array.isArray(value)) return []
  const items: StoredCustomVariant[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object') continue
    const row = entry as Record<string, unknown>
    if (typeof row.id !== 'string' || !isCustomFormatId(row.id)) continue
    if (typeof row.label !== 'string') continue
    const label = row.label.trim().slice(0, 40)
    if (!label) continue
    const file = readVariant(row)
    if (!file || items.some((item) => item.id === row.id)) continue
    const width = pixelSize(row.width)
    const height = pixelSize(row.height)
    items.push({ id: row.id, label, ...file, ...(width && height ? { width, height } : {}) })
  }
  return items.slice(0, 8)
}

function readVariant(value: unknown): AssetVariant | null {
  if (!value || typeof value !== 'object') return null
  const variant = value as Record<string, unknown>
  if (typeof variant.fileId !== 'string' || !isDriveFileId(variant.fileId)) return null
  if (typeof variant.name !== 'string' || !variant.name.trim() || variant.name.length > 180) return null
  if (typeof variant.bytes !== 'number' || !Number.isSafeInteger(variant.bytes) || variant.bytes <= 0) return null
  if (typeof variant.mimeType !== 'string' || !variant.mimeType.startsWith('image/') || variant.mimeType.length > 120) return null
  return { fileId: variant.fileId, name: variant.name, bytes: variant.bytes, mimeType: variant.mimeType }
}

function cleanUse(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 500)
}
