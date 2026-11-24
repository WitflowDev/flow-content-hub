'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { requireAdmin } from '@/lib/auth/admin'
import { isDriveFileId } from '@/lib/drive/client'
import { ensureBrandFolder, trashOwnedItem, uploadOwnedImage } from '@/lib/drive/owner'
import { adminDb } from '@/lib/firebase/admin'

type Result = { ok: true } | { ok: false; message: string }
type BrandSlot = 'logo' | 'banner'

const USER_ID = /^[A-Za-z0-9]{10,128}$/
const LOGO_LIMIT = 2_000_000
const BANNER_LIMIT = 8_000_000

export async function saveClientLogo(formData: FormData): Promise<Result> {
  return saveBrandFile(formData, 'logo')
}

export async function clearClientLogo(userId: string): Promise<Result> {
  return clearBrandFile(userId, 'logo')
}

export async function saveClientBanner(formData: FormData): Promise<Result> {
  return saveBrandFile(formData, 'banner')
}

export async function clearClientBanner(userId: string): Promise<Result> {
  return clearBrandFile(userId, 'banner')
}

async function saveBrandFile(formData: FormData, slot: BrandSlot): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: denied(slot, 'add') }
  const userId = text(formData.get('userId'))
  const file = formData.get(slot)
  if (!USER_ID.test(userId)) return { ok: false, message: 'That account could not be updated.' }
  if (!(file instanceof File)) return { ok: false, message: missingFile(slot) }
  const kind = imageKind(file.type, slot)
  if (!kind) return { ok: false, message: wrongType(slot) }
  if (file.size <= 0 || file.size > slotLimit(slot)) return { ok: false, message: tooLarge(slot) }

  const ref = adminDb().collection('users').doc(userId)
  const existing = await ref.get()
  if (!existing.exists) return { ok: false, message: 'That account could not be updated.' }
  const folderId = text(existing.get('driveFolderId'))
  if (!isDriveFileId(folderId)) return { ok: false, message: needsFolder(slot) }
  const storedKey = fileKey(slot)
  const previous = text(existing.get(storedKey))

  let fileId = ''
  try {
    const parentId = await ensureBrandFolder(folderId)
    fileId = await uploadOwnedImage(parentId, kind.name, kind.mimeType, new Uint8Array(await file.arrayBuffer()))
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'The image could not be saved.')
    return { ok: false, message: saveFailed(slot) }
  }

  await ref.set({ [storedKey]: fileId }, { merge: true })
  if (previous && previous !== fileId && isDriveFileId(previous)) {
    await trashOwnedItem(previous).catch(() => undefined)
  }
  return { ok: true }
}

async function clearBrandFile(userId: string, slot: BrandSlot): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: denied(slot, 'remove') }
  if (!USER_ID.test(userId)) return { ok: false, message: 'That account could not be updated.' }
  const ref = adminDb().collection('users').doc(userId)
  const existing = await ref.get()
  if (!existing.exists) return { ok: false, message: 'That account could not be updated.' }
  const storedKey = fileKey(slot)
  const previous = text(existing.get(storedKey))
  await ref.set({ [storedKey]: FieldValue.delete() }, { merge: true })
  if (isDriveFileId(previous)) await trashOwnedItem(previous).catch(() => undefined)
  return { ok: true }
}

function fileKey(slot: BrandSlot): 'logoFileId' | 'bannerFileId' {
  switch (slot) {
    case 'logo':
      return 'logoFileId'
    case 'banner':
      return 'bannerFileId'
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

function slotLimit(slot: BrandSlot): number {
  switch (slot) {
    case 'logo':
      return LOGO_LIMIT
    case 'banner':
      return BANNER_LIMIT
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

function imageKind(type: string, slot: BrandSlot): { mimeType: string; name: string } | null {
  switch (type) {
    case 'image/png':
      return { mimeType: type, name: `${slot}.png` }
    case 'image/jpeg':
      return { mimeType: type, name: `${slot}.jpg` }
    case 'image/webp':
      return { mimeType: type, name: `${slot}.webp` }
    default:
      return null
  }
}

function denied(slot: BrandSlot, action: 'add' | 'remove'): string {
  switch (slot) {
    case 'logo':
      return action === 'add' ? 'Only an admin can add a logo.' : 'Only an admin can remove a logo.'
    case 'banner':
      return action === 'add' ? 'Only an admin can add a home banner.' : 'Only an admin can remove a home banner.'
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

function missingFile(slot: BrandSlot): string {
  switch (slot) {
    case 'logo':
      return 'Choose a logo image.'
    case 'banner':
      return 'Choose a banner image.'
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

function wrongType(slot: BrandSlot): string {
  switch (slot) {
    case 'logo':
      return 'Use a PNG, JPG or WebP logo.'
    case 'banner':
      return 'Use a PNG, JPG or WebP banner.'
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

function tooLarge(slot: BrandSlot): string {
  switch (slot) {
    case 'logo':
      return 'Use a logo up to 2 MB.'
    case 'banner':
      return 'Use a banner up to 8 MB.'
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

function needsFolder(slot: BrandSlot): string {
  switch (slot) {
    case 'logo':
      return 'This account needs a Drive folder before a logo can be added.'
    case 'banner':
      return 'This account needs a Drive folder before a banner can be added.'
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

function saveFailed(slot: BrandSlot): string {
  switch (slot) {
    case 'logo':
      return 'The logo could not be saved.'
    case 'banner':
      return 'The banner could not be saved.'
    default: {
      const unexpected: never = slot
      return unexpected
    }
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
