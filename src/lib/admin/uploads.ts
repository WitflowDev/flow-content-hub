import 'server-only'
import { isCustomFormatId, parseExportIds, type ExportId } from '@/data/exports'
import { parseRole } from '@/lib/auth'
import { sealUploadTicket } from '@/lib/admin/upload-ticket'
import { parseTags } from '@/lib/tags'
import { isDriveFileId, listClientFolder, readDirectChildFolder, readFolderName } from '@/lib/drive/client'
import { beginOwnedUpload, companyFolderName, createOwnedFolder } from '@/lib/drive/owner'
import { writeCollectionState } from '@/lib/drive/publish'
import { readUserProfile } from '@/lib/firebase/profile'

const MAX_UPLOAD_BYTES = 1024 * 1024 * 1024

const MEDIA_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
  'video/mp4',
  'video/quicktime',
  'video/webm',
])

export type UploadSession = {
  ticket: string
  destinationId: string
}

export async function openAdminUpload(
  adminUid: string,
  input: {
    accountId: string
    destinationId: string
    collectionName: string
    collectionDescription: string
    fileName: string
    mimeType: string
    size: number
    tags: string
    suggestedUse: string
    formats: ExportId[]
    variantParentId: string
    variantFormat: ExportId | null
    variantCustomId: string
    variantCustomLabel: string
  },
): Promise<UploadSession> {
  const fileName = cleanedFileName(input.fileName)
  if (!fileName) throw new Error('Use a photo or video file.')
  const mimeType = mediaType(input.mimeType, fileName)
  if (!mimeType) throw new Error('Use a photo or video file.')
  if (!Number.isSafeInteger(input.size) || input.size <= 0 || input.size > MAX_UPLOAD_BYTES) {
    throw new Error('Files need to be under 1 GB.')
  }
  const customId = isCustomFormatId(input.variantCustomId) ? input.variantCustomId : ''
  const customLabel = input.variantCustomLabel.trim().slice(0, 40)
  if (input.variantFormat && customId) throw new Error('Choose one format for this photo.')
  if (customId && !customLabel) throw new Error('Name this format.')
  const linked = Boolean(input.variantFormat || customId)
  if (input.variantParentId && !isDriveFileId(input.variantParentId)) throw new Error('The default photo could not be found.')
  if (Boolean(input.variantParentId) !== linked) throw new Error('Choose a format for this photo.')
  if (linked && !mimeType.startsWith('image/')) throw new Error('Each extra format needs to be a photo.')
  if (!isAccountId(input.accountId)) throw new Error('Choose a client account.')

  const profile = await readUserProfile(input.accountId)
  const clientFolderId = profile?.driveFolderId ?? ''
  if (!profile || !clientFolderId || parseRole(profile.role) !== 'client') {
    throw new Error('This account has no Drive folder.')
  }
  await readFolderName(clientFolderId)

  const parentId = await destinationFolder(
    clientFolderId,
    input.accountId,
    input.destinationId,
    input.collectionName,
    input.collectionDescription,
  )
  const uploadUrl = await beginOwnedUpload({
    parentId,
    name: fileName,
    mimeType,
    size: input.size,
  })
  return {
    ticket: sealUploadTicket({
      uploadUrl,
      mimeType,
      size: input.size,
      adminUid,
      accountId: input.accountId,
      tags: parseTags(input.tags),
      suggestedUse: input.suggestedUse.trim().slice(0, 500),
      formats: linked ? [] : input.formats,
      fileName,
      variantParentId: input.variantParentId,
      variantFormat: input.variantFormat,
      variantCustomId: input.variantFormat ? '' : customId,
      variantCustomLabel: input.variantFormat ? '' : customLabel,
    }),
    destinationId: parentId,
  }
}

async function destinationFolder(
  clientFolderId: string,
  accountId: string,
  destinationId: string,
  collectionName: string,
  collectionDescription: string,
): Promise<string> {
  if (destinationId) {
    if (!isDriveFileId(destinationId)) throw new Error('That collection is not in this client folder.')
    if (destinationId === clientFolderId) return clientFolderId
    const child = await readDirectChildFolder(clientFolderId, destinationId)
    if (!child) throw new Error('That collection is not in this client folder.')
    return child.id
  }

  const trimmed = collectionName.trim()
  if (!trimmed) return clientFolderId
  const name = companyFolderName(trimmed)
  if (!name) throw new Error('Enter a collection name.')
  const listed = await listClientFolder(clientFolderId)
  const existing = listed.collections.find((collection) => sameName(collection.name, name))
  if (existing) return existing.id

  const created = await createOwnedFolder(clientFolderId, name)
  await writeCollectionState({
    folderId: created.id,
    accountId,
    title: created.name,
    published: false,
    description: collectionDescription,
    tags: [],
  })
  return created.id
}

export async function lookupStandardStarts(input: {
  accountId: string
  destinationId: string
  collectionName: string
}): Promise<{ photo: number; video: number }> {
  if (!isAccountId(input.accountId)) throw new Error('Choose a client account.')
  const profile = await readUserProfile(input.accountId)
  const clientFolderId = profile?.driveFolderId ?? ''
  if (!profile || !clientFolderId || parseRole(profile.role) !== 'client') {
    throw new Error('This account has no Drive folder.')
  }
  await readFolderName(clientFolderId)
  const listed = await listClientFolder(clientFolderId)
  if (input.destinationId) {
    if (!isDriveFileId(input.destinationId)) throw new Error('That collection is not in this client folder.')
    if (input.destinationId === clientFolderId) return nextStandardNumbers(listed.files.filter((file) => file.collectionId === null))
    const child = listed.collections.find((collection) => collection.id === input.destinationId)
    if (!child) throw new Error('That collection is not in this client folder.')
    return nextStandardNumbers(listed.files.filter((file) => file.collectionId === child.id))
  }
  const trimmed = input.collectionName.trim()
  if (!trimmed) return nextStandardNumbers(listed.files.filter((file) => file.collectionId === null))
  const name = companyFolderName(trimmed)
  const existing = name ? listed.collections.find((collection) => sameName(collection.name, name)) : undefined
  if (!existing) return { photo: 1, video: 1 }
  return nextStandardNumbers(listed.files.filter((file) => file.collectionId === existing.id))
}

function nextStandardNumbers(files: Array<{ name: string }>): { photo: number; video: number } {
  return {
    photo: nextStandardNumber(files, /^Photo #(\d+)(?:\.[^.]+)?$/),
    video: nextStandardNumber(files, /^Video #(\d+)(?:\.[^.]+)?$/),
  }
}

function nextStandardNumber(files: Array<{ name: string }>, pattern: RegExp): number {
  let max = 0
  for (const file of files) {
    const match = pattern.exec(file.name)
    const value = match?.[1] ? Number(match[1]) : 0
    if (Number.isInteger(value) && value > max) max = value
  }
  return max + 1
}

function cleanedFileName(value: string): string | null {
  const base = value.split(/[/\\]/).pop() ?? ''
  const cleaned = base.replace(/[\u0000-\u001F\u007F]/g, '').trim()
  if (!cleaned || cleaned === '.' || cleaned === '..' || cleaned.length > 180) return null
  return cleaned
}

function mediaType(mimeType: string, fileName: string): string | null {
  const normalized = mimeType === 'image/jpg' ? 'image/jpeg' : mimeType.toLowerCase()
  if (MEDIA_TYPES.has(normalized)) return normalized
  const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase()
  switch (extension) {
    case '.jpg':
    case '.jpeg':
      return 'image/jpeg'
    case '.png':
      return 'image/png'
    case '.webp':
      return 'image/webp'
    case '.gif':
      return 'image/gif'
    case '.heic':
      return 'image/heic'
    case '.heif':
      return 'image/heif'
    case '.mp4':
      return 'video/mp4'
    case '.mov':
      return 'video/quicktime'
    case '.webm':
      return 'video/webm'
    default:
      return null
  }
}

function sameName(left: string, right: string): boolean {
  return normalize(left) === normalize(right)
}

function normalize(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

function isAccountId(value: string): boolean {
  return /^[A-Za-z0-9]{10,128}$/.test(value)
}
