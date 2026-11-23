'use server'

import { formatVariantId } from '@/data/exports'
import type { AdminCollectionDetail, AdminPost } from '@/lib/admin/types'
import { requireAdmin } from '@/lib/auth/admin'
import { parseRole } from '@/lib/auth'
import { invalidateLibrary, invalidateThumbnail } from '@/lib/drive/cache'
import { isDriveFileId, listClientFolder, readDirectChildFolder, readFolderName } from '@/lib/drive/client'
import { lookupStandardStarts } from '@/lib/admin/uploads'
import { companyFolderName, renameOwnedItem, trashOwnedItem } from '@/lib/drive/owner'
import {
  appendCollectionMaps,
  deleteCollectionState,
  dropFilesFromMaps,
  readCollectionRecords,
  writeCollectionMaps,
  writeCollectionState,
} from '@/lib/drive/publish'
import { deleteAssetCopy, readAssetCopy, saveAssetCopy } from '@/lib/drive/tags'
import { readUserProfile } from '@/lib/firebase/profile'
import { parseTags } from '@/lib/tags'

type Result = { ok: true } | { ok: false; message: string }

type LocatedCollection = {
  ok: true
  clientFolderId: string
  folder: { id: string; name: string }
  files: Array<{ id: string; name: string; mimeType: string }>
}

export async function loadAdminCollection(input: {
  accountId: string
  folderId: string
}): Promise<{ ok: true; detail: AdminCollectionDetail } | { ok: false; message: string }> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can open a collection.' }
  const located = await locateCollection(input.accountId, input.folderId)
  if (!located.ok) return located
  const visible = located.files.filter((file) => !formatVariantId(file.name))
  const copy = await readAssetCopy(visible.map((file) => file.id))
  const records = await readCollectionRecords([located.folder.id])
  const record = records.get(located.folder.id)
  const posts: AdminPost[] = visible.map((file) => {
    const saved = copy.get(file.id)
    return {
      id: file.id,
      title: titleFromName(file.name),
      description: saved?.suggestedUse ?? '',
      tags: saved?.tags ?? [],
      video: file.mimeType.startsWith('video/'),
    }
  })
  return {
    ok: true,
    detail: {
      id: located.folder.id,
      title: located.folder.name,
      description: record?.description ?? '',
      tags: record?.tags ?? [],
      posts,
      maps: (record?.maps ?? [])
        .map((map) => ({
          description: map.description,
          fileIds: map.fileIds.filter((id) => visible.some((file) => file.id === id)),
        }))
        .filter((map) => map.fileIds.length >= 2),
    },
  }
}

export async function updateAdminPost(input: {
  accountId: string
  folderId: string
  fileId: string
  title: string
  description: string
  tags: string
}): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can edit a post.' }
  const title = input.title.trim()
  if (!title || title.length > 140) return { ok: false, message: 'Enter a title.' }
  if (input.description.trim().length > 500) return { ok: false, message: 'Use a shorter description.' }
  if (input.tags.length > 300) return { ok: false, message: 'Use fewer tags.' }
  const located = await locateCollection(input.accountId, input.folderId)
  if (!located.ok) return located
  const file = located.files.find((item) => item.id === input.fileId)
  if (!file || formatVariantId(file.name)) return { ok: false, message: 'That post is not in this collection.' }
  const nextName = nextFileName(title, file.name)
  if (!nextName) return { ok: false, message: 'Enter a title.' }
  try {
    if (nextName !== file.name) await renameOwnedItem(file.id, nextName)
    await saveAssetCopy(file.id, input.accountId, parseTags(input.tags), input.description)
  } catch (error) {
    return { ok: false, message: publicMessage(error, 'The post could not be saved.') }
  }
  refreshLibrary(located.clientFolderId, [file.id])
  return { ok: true }
}

export async function deleteAdminPost(input: {
  accountId: string
  folderId: string
  fileId: string
}): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can delete a post.' }
  const located = await locateCollection(input.accountId, input.folderId)
  if (!located.ok) return located
  const file = located.files.find((item) => item.id === input.fileId)
  if (!file || formatVariantId(file.name)) return { ok: false, message: 'That post is not in this collection.' }
  try {
    const extras = await linkedVariantIds([file.id])
    await trashCollectionFiles([file.id, ...extras].map((id) => ({ id })))
    await dropFilesFromMaps(located.folder.id, [file.id])
  } catch (error) {
    return { ok: false, message: publicMessage(error, 'The post could not be deleted.') }
  }
  refreshLibrary(located.clientFolderId, [file.id])
  return { ok: true }
}

export async function deleteAdminPosts(input: {
  accountId: string
  folderId: string
  fileIds: string[]
}): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can delete a post.' }
  if (!Array.isArray(input.fileIds) || input.fileIds.length === 0 || input.fileIds.length > 200) {
    return { ok: false, message: 'Select between one and 200 files.' }
  }
  const located = await locateCollection(input.accountId, input.folderId)
  if (!located.ok) return located
  const allowed = new Set(located.files.map((file) => file.id))
  const fileIds = [...new Set(input.fileIds.filter((id) => allowed.has(id)))]
  const visibleIds = fileIds.filter((id) => {
    const file = located.files.find((item) => item.id === id)
    return file && !formatVariantId(file.name)
  })
  if (visibleIds.length === 0) return { ok: false, message: 'Those files are not in this collection.' }
  try {
    const extras = await linkedVariantIds(visibleIds)
    await trashCollectionFiles([...new Set([...visibleIds, ...extras])].map((id) => ({ id })))
    await dropFilesFromMaps(located.folder.id, visibleIds)
  } catch (error) {
    return { ok: false, message: publicMessage(error, 'The files could not be deleted.') }
  }
  refreshLibrary(located.clientFolderId, fileIds)
  return { ok: true }
}

export async function updateAdminCollection(input: {
  accountId: string
  folderId: string
  title: string
  description: string
  tags: string
  published: boolean
  maps: Array<{ fileIds: string[]; description: string }>
}): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can edit a collection.' }
  if (typeof input.published !== 'boolean') return { ok: false, message: 'That collection could not be saved.' }
  if (input.description.trim().length > 500) return { ok: false, message: 'Use a shorter description.' }
  if (input.tags.length > 300) return { ok: false, message: 'Use fewer tags.' }
  const name = companyFolderName(input.title)
  if (!name) return { ok: false, message: 'Enter a collection name.' }
  const located = await locateCollection(input.accountId, input.folderId)
  if (!located.ok) return located
  const maps = readMaps(input.maps, new Set(located.files.map((file) => file.id)), 12)
  if (!maps) return { ok: false, message: 'Each carousel needs at least two files from this collection.' }
  try {
    if (name !== located.folder.name) await renameOwnedItem(located.folder.id, name)
    await writeCollectionState({
      folderId: located.folder.id,
      accountId: input.accountId,
      title: name,
      published: input.published,
      description: input.description,
      tags: parseTags(input.tags),
    })
    await writeCollectionMaps(located.folder.id, maps)
  } catch (error) {
    return { ok: false, message: publicMessage(error, 'The collection could not be saved.') }
  }
  refreshLibrary(located.clientFolderId)
  return { ok: true }
}

export async function nextStandardNames(input: {
  accountId: string
  destinationId: string
  collectionName: string
}): Promise<{ ok: true; photo: number; video: number } | { ok: false; message: string }> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can upload.' }
  try {
    const starts = await lookupStandardStarts(input)
    return { ok: true, photo: starts.photo, video: starts.video }
  } catch (error) {
    return { ok: false, message: publicMessage(error, 'The file names could not be prepared.') }
  }
}

export async function saveCollectionMaps(input: {
  accountId: string
  folderId: string
  maps: Array<{ fileIds: string[]; description: string }>
}): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can save a content map.' }
  const located = await locateCollection(input.accountId, input.folderId)
  if (!located.ok) return located
  const maps = readMaps(input.maps, new Set(located.files.map((file) => file.id)), 8)
  if (!maps || maps.length === 0) {
    return { ok: false, message: 'Each content map needs at least two files from this upload.' }
  }
  try {
    await appendCollectionMaps(located.folder.id, maps)
  } catch (error) {
    return { ok: false, message: publicMessage(error, 'The content maps could not be saved.') }
  }
  refreshLibrary(located.clientFolderId)
  return { ok: true }
}

export async function deleteAdminCollection(input: { accountId: string; folderId: string }): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can delete a collection.' }
  const located = await locateCollection(input.accountId, input.folderId)
  if (!located.ok) return located
  try {
    await trashCollectionFiles(located.files)
    await trashOwnedItem(located.folder.id)
    await deleteCollectionState(located.folder.id)
  } catch (error) {
    return { ok: false, message: publicMessage(error, 'The collection could not be deleted.') }
  }
  refreshLibrary(located.clientFolderId, located.files.map((file) => file.id))
  return { ok: true }
}

function refreshLibrary(folderId: string, fileIds: string[] = []): void {
  invalidateLibrary(folderId)
  for (const fileId of fileIds) invalidateThumbnail(fileId)
}

async function locateCollection(
  accountId: string,
  folderId: string,
): Promise<LocatedCollection | { ok: false; message: string }> {
  if (!isAccountId(accountId) || !isDriveFileId(folderId)) {
    return { ok: false, message: 'That collection could not be opened.' }
  }
  const profile = await readUserProfile(accountId)
  const clientFolderId = profile?.driveFolderId ?? ''
  if (!profile || !clientFolderId || parseRole(profile.role) !== 'client') {
    return { ok: false, message: 'This account has no Drive folder.' }
  }
  try {
    await readFolderName(clientFolderId)
  } catch {
    return { ok: false, message: 'This account has no Drive folder.' }
  }
  const folder = await readDirectChildFolder(clientFolderId, folderId)
  if (!folder) return { ok: false, message: 'That collection is not in this client folder.' }
  try {
    const listed = await listClientFolder(clientFolderId)
    return {
      ok: true,
      clientFolderId,
      folder,
      files: listed.files.filter((file) => file.collectionId === folder.id),
    }
  } catch (error) {
    return { ok: false, message: publicMessage(error, 'The collection could not be opened.') }
  }
}

function nextFileName(title: string, currentName: string): string | null {
  if (titleFromName(currentName) === title) return currentName
  const cleaned = title.replace(/[\\/\u0000-\u001F\u007F]/g, '').trim()
  if (!cleaned || cleaned === '.' || cleaned === '..') return null
  const dot = currentName.lastIndexOf('.')
  const extension = dot > 0 && currentName.slice(dot).length <= 12 ? currentName.slice(dot) : ''
  const next = `${cleaned.slice(0, 160)}${extension}`
  if (!next || next.length > 180) return null
  return next
}

function titleFromName(name: string): string {
  const extension = name.lastIndexOf('.')
  const title = extension > 0 ? name.slice(0, extension) : name
  return title.replaceAll('_', ' ').trim() || name
}

async function linkedVariantIds(fileIds: string[]): Promise<string[]> {
  const copy = await readAssetCopy(fileIds)
  const ids: string[] = []
  for (const item of copy.values()) {
    for (const variant of Object.values(item.variants)) {
      if (variant && isDriveFileId(variant.fileId)) ids.push(variant.fileId)
    }
    for (const variant of item.customVariants) {
      if (isDriveFileId(variant.fileId)) ids.push(variant.fileId)
    }
  }
  return ids
}

async function trashCollectionFiles(files: Array<{ id: string }>): Promise<void> {
  const pending = [...files]
  async function worker(): Promise<void> {
    while (pending.length > 0) {
      const file = pending.shift()
      if (!file) return
      await trashOwnedItem(file.id)
      await deleteAssetCopy(file.id)
    }
  }
  const workers = Array.from({ length: Math.min(4, pending.length) }, () => worker())
  await Promise.all(workers)
}

function readMaps(
  value: Array<{ fileIds: string[]; description: string }>,
  allowed: Set<string>,
  limit: number,
): Array<{ fileIds: string[]; description: string }> | null {
  if (!Array.isArray(value) || value.length > limit) return null
  const maps: Array<{ fileIds: string[]; description: string }> = []
  for (const map of value) {
    if (!map || typeof map.description !== 'string' || map.description.length > 500 || !Array.isArray(map.fileIds)) return null
    const fileIds = cleanMap(map.fileIds, allowed)
    if (fileIds.length < 2) return null
    maps.push({ fileIds, description: map.description.trim().slice(0, 500) })
  }
  return maps
}

function cleanMap(ids: string[], allowed: Set<string>): string[] {
  if (!Array.isArray(ids)) return []
  const seen = new Set<string>()
  const fileIds: string[] = []
  for (const id of ids) {
    if (!isDriveFileId(id) || !allowed.has(id) || seen.has(id)) continue
    seen.add(id)
    fileIds.push(id)
    if (fileIds.length >= 10) break
  }
  return fileIds
}

function isAccountId(value: string): boolean {
  return /^[A-Za-z0-9]{10,128}$/.test(value)
}

function publicMessage(error: unknown, fallback: string): string {
  const message = error instanceof Error ? error.message : ''
  if (!message || message.length > 180) return fallback
  return message
}
