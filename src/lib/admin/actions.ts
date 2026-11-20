'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { isServiceRequestStatus } from '@/lib/admin/types'
import { requireAdmin } from '@/lib/auth/admin'
import { isDriveFileId, listClientFolder, readDirectChildFolder, readFolderName } from '@/lib/drive/client'
import { invalidateLibrary } from '@/lib/drive/cache'
import { writeCollectionState } from '@/lib/drive/publish'
import { adminDb } from '@/lib/firebase/admin'
import { readUserProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'
import { formatPhone } from '@/lib/phone/countries'
import { isServiceName } from '@/lib/requests/services'

const MESSAGE_LIMIT = 1000

export async function submitServiceRequest(input: {
  service: string
  message: string
  phoneIso: string
  phoneNumber: string
  assetFileId: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const user = await getSessionUser()
  if (!user) return { ok: false, message: 'Sign in before sending a message.' }
  if (!isServiceName(input.service)) return { ok: false, message: 'Choose a service.' }
  const message = input.message.trim()
  if (!message) return { ok: false, message: 'Tell us what you need.' }
  if (message.length > MESSAGE_LIMIT) return { ok: false, message: 'Use a shorter message.' }
  const phone = formatPhone(input.phoneIso, input.phoneNumber)
  if (phone === null) return { ok: false, message: 'Enter a valid phone number, or leave it blank.' }
  if (input.assetFileId.length > 128) return { ok: false, message: 'That asset is not in your library.' }

  const profile = await readUserProfile(user.uid)
  const asset = await requestAsset(profile?.driveFolderId ?? '', input.assetFileId.trim())
  if (!asset.ok) return asset
  await adminDb().collection('requests').add({
    userId: user.uid,
    email: user.email ?? profile?.email ?? '',
    name: profile?.name ?? '',
    companyName: profile?.companyName ?? '',
    service: input.service,
    message,
    phone,
    assetFileId: asset.fileId,
    assetTitle: asset.title,
    assetFolderId: asset.folderId,
    status: 'new',
    createdAt: FieldValue.serverTimestamp(),
  })
  return { ok: true }
}

export async function setRequestStatus(input: {
  id: string
  status: string
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can update a request.' }
  if (!isDocId(input.id) || !isServiceRequestStatus(input.status)) {
    return { ok: false, message: 'That request could not be updated.' }
  }
  const ref = adminDb().collection('requests').doc(input.id)
  const existing = await ref.get()
  if (!existing.exists) return { ok: false, message: 'That request could not be updated.' }
  await ref.update({ status: input.status })
  return { ok: true }
}

export async function setCollectionPublished(input: {
  accountId: string
  folderId: string
  published: boolean
}): Promise<{ ok: true } | { ok: false; message: string }> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can publish a collection.' }
  if (!isDocId(input.accountId) || !isDriveFileId(input.folderId) || typeof input.published !== 'boolean') {
    return { ok: false, message: 'That collection could not be updated.' }
  }

  const profile = await readUserProfile(input.accountId)
  if (!profile?.driveFolderId) return { ok: false, message: 'This account has no Drive folder.' }
  try {
    await readFolderName(profile.driveFolderId)
  } catch {
    return { ok: false, message: 'This account has no Drive folder.' }
  }
  const folder = await readDirectChildFolder(profile.driveFolderId, input.folderId)
  if (!folder) return { ok: false, message: 'That collection is not in this client folder.' }

  await writeCollectionState({
    folderId: folder.id,
    accountId: input.accountId,
    title: folder.name,
    published: input.published,
  })
  invalidateLibrary(profile.driveFolderId)
  return { ok: true }
}

async function requestAsset(
  folderId: string,
  fileId: string,
): Promise<{ ok: true; fileId: string; folderId: string; title: string } | { ok: false; message: string }> {
  if (!fileId) return { ok: true, fileId: '', folderId: '', title: '' }
  if (!isDriveFileId(fileId) || !isDriveFileId(folderId)) {
    return { ok: false, message: 'That asset is not in your library.' }
  }
  try {
    const listed = await listClientFolder(folderId)
    const file = listed.files.find((item) => item.id === fileId)
    if (!file) return { ok: false, message: 'That asset is not in your library.' }
    return { ok: true, fileId: file.id, folderId, title: titleFromName(file.name) }
  } catch {
    return { ok: false, message: 'That asset is not in your library.' }
  }
}

function titleFromName(name: string): string {
  const extension = name.lastIndexOf('.')
  const title = extension > 0 ? name.slice(0, extension) : name
  return title.replaceAll('_', ' ').trim() || name
}

function isDocId(value: string): boolean {
  return /^[A-Za-z0-9]{10,128}$/.test(value)
}
