import 'server-only'
import { FieldValue } from 'firebase-admin/firestore'
import { isDriveFileId } from '@/lib/drive/client'
import { adminDb } from '@/lib/firebase/admin'
import { parseTags } from '@/lib/tags'

const READ_BATCH = 100
const DESCRIPTION_LIMIT = 500

export type ContentMapRecord = {
  fileIds: string[]
  description: string
}

export type CollectionRecord = {
  published: boolean
  description: string
  tags: string[]
  maps: ContentMapRecord[]
  coverFileId: string
}

export async function readCollectionRecords(folderIds: string[]): Promise<Map<string, CollectionRecord>> {
  const ids = [...new Set(folderIds.filter(isDriveFileId))]
  const records = new Map<string, CollectionRecord>()
  if (ids.length === 0) return records
  const db = adminDb()
  for (let index = 0; index < ids.length; index += READ_BATCH) {
    const slice = ids.slice(index, index + READ_BATCH)
    const snaps = await db.getAll(...slice.map((id) => db.collection('collections').doc(id)))
    for (const snap of snaps) {
      if (!snap.exists) continue
      records.set(snap.id, {
        published: snap.get('published') !== false,
        description: cleanDescription(snap.get('description')),
        tags: storedTags(snap.get('tags')),
        maps: storedMaps(snap.get('maps')),
        coverFileId: storedCover(snap.get('coverFileId')),
      })
    }
  }
  return records
}

export async function unpublishedCollectionIds(folderIds: string[]): Promise<Set<string>> {
  const records = await readCollectionRecords(folderIds)
  const hidden = new Set<string>()
  for (const [id, record] of records) {
    if (!record.published) hidden.add(id)
  }
  return hidden
}

export async function writeCollectionState(input: {
  folderId: string
  accountId: string
  title: string
  published: boolean
  description?: string
  tags?: string[]
}): Promise<void> {
  const ref = adminDb().collection('collections').doc(input.folderId)
  const existing = await ref.get()
  const savedOrder = existing.get('sortOrder')
  const payload: {
    profileId: string
    title: string
    published: boolean
    driveFolderId: string
    sortOrder: number
    description?: string
    tags?: string[]
  } = {
    profileId: input.accountId,
    title: input.title,
    published: input.published,
    driveFolderId: input.folderId,
    sortOrder: typeof savedOrder === 'number' ? savedOrder : Date.now(),
  }
  if (input.description !== undefined) payload.description = cleanDescription(input.description)
  if (input.tags !== undefined) payload.tags = input.tags
  await ref.set(payload, { merge: true })
}

export async function appendCollectionMaps(folderId: string, maps: ContentMapRecord[]): Promise<void> {
  if (!isDriveFileId(folderId) || maps.length === 0) return
  const ref = adminDb().collection('collections').doc(folderId)
  const existing = await ref.get()
  const next = [...storedMaps(existing.get('maps')), ...maps].slice(0, 12)
  await ref.set({ maps: next, driveFolderId: folderId }, { merge: true })
}

export async function writeCollectionMaps(folderId: string, maps: ContentMapRecord[]): Promise<void> {
  if (!isDriveFileId(folderId)) return
  await adminDb()
    .collection('collections')
    .doc(folderId)
    .set({ maps: maps.slice(0, 12), driveFolderId: folderId }, { merge: true })
}

export async function dropFilesFromMaps(folderId: string, fileIds: string[]): Promise<void> {
  const drop = new Set(fileIds.filter(isDriveFileId))
  if (!isDriveFileId(folderId) || drop.size === 0) return
  const ref = adminDb().collection('collections').doc(folderId)
  const existing = await ref.get()
  const maps = storedMaps(existing.get('maps'))
    .map((map) => ({ ...map, fileIds: map.fileIds.filter((id) => !drop.has(id)) }))
    .filter((map) => map.fileIds.length >= 2)
  await ref.set({ maps, driveFolderId: folderId }, { merge: true })
}

export async function writeCollectionCover(folderId: string, coverFileId: string): Promise<void> {
  if (!isDriveFileId(folderId)) return
  const ref = adminDb().collection('collections').doc(folderId)
  if (isDriveFileId(coverFileId)) {
    await ref.set({ coverFileId, driveFolderId: folderId }, { merge: true })
    return
  }
  await ref.set({ coverFileId: FieldValue.delete() }, { merge: true })
}

export async function dropCollectionCover(folderId: string, fileIds: string[]): Promise<void> {
  if (!isDriveFileId(folderId) || fileIds.length === 0) return
  const ref = adminDb().collection('collections').doc(folderId)
  const existing = await ref.get()
  const cover = existing.get('coverFileId')
  if (typeof cover === 'string' && fileIds.includes(cover)) {
    await ref.set({ coverFileId: FieldValue.delete() }, { merge: true })
  }
}

export async function deleteCollectionState(folderId: string): Promise<void> {
  if (!isDriveFileId(folderId)) return
  await adminDb().collection('collections').doc(folderId).delete()
}

function storedCover(value: unknown): string {
  return typeof value === 'string' && isDriveFileId(value) ? value : ''
}

function storedTags(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return parseTags(value.filter((tag): tag is string => typeof tag === 'string').join(', '))
}

function storedMaps(value: unknown): ContentMapRecord[] {
  if (!Array.isArray(value)) return []
  const maps: ContentMapRecord[] = []
  for (const entry of value) {
    if (!entry || typeof entry !== 'object' || !('fileIds' in entry)) continue
    const raw = (entry as { fileIds?: unknown }).fileIds
    if (!Array.isArray(raw)) continue
    const fileIds = raw.filter((id): id is string => typeof id === 'string' && isDriveFileId(id)).slice(0, 10)
    if (fileIds.length < 2) continue
    const description = cleanDescription('description' in entry ? (entry as { description?: unknown }).description : '')
    maps.push({ fileIds, description })
    if (maps.length >= 12) break
  }
  return maps
}

function cleanDescription(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, DESCRIPTION_LIMIT)
}
