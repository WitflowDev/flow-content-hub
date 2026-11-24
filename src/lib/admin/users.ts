'use server'

import { FieldValue } from 'firebase-admin/firestore'
import type { AppRole } from '@/lib/auth'
import { parseRole } from '@/lib/auth'
import { parseInterfaceTheme, readInterfaceTheme, type InterfaceTheme } from '@/lib/interface-theme'
import type { AdminUser } from '@/lib/admin/types'
import { requireAdmin } from '@/lib/auth/admin'
import { companyFolderName, createClientDriveFolder, ownerAccessConfigured } from '@/lib/drive/owner'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { readStoredPalette, type ThemePalette } from '@/lib/theme-palette'

type UserInput = {
  name: string
  email: string
  companyName: string
  role: string
  password: string
  interfaceTheme: string
  themeColors: ThemePalette
}

type SavedUser = {
  name: string
  email: string
  companyName: string
  role: AppRole
  password: string
  interfaceTheme: InterfaceTheme
  themeColors: Partial<ThemePalette>
}

type Result = { ok: true; id?: string } | { ok: false; message: string }

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const USER_PAGE_SIZE = 5

export async function loadAdminUsersPage(page: number): Promise<
  { ok: true; users: AdminUser[]; page: number; pageCount: number } | { ok: false; message: string }
> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can view accounts.' }
  if (!Number.isInteger(page) || page < 1 || page > 10000) {
    return { ok: false, message: 'That page of accounts could not be opened.' }
  }
  const query = adminDb().collection('users').orderBy('email')
  const total = (await query.count().get()).data().count
  const pageCount = Math.max(1, Math.ceil(total / USER_PAGE_SIZE))
  const safePage = Math.min(page, pageCount)
  const snap = await query.offset((safePage - 1) * USER_PAGE_SIZE).limit(USER_PAGE_SIZE).get()
  return {
    ok: true,
    page: safePage,
    pageCount,
    users: snap.docs.map((item) => mapListedUser(item.id, item.data())),
  }
}

export async function createAdminUser(input: UserInput): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can add a user.' }
  const saved = readUser(input, true)
  if (!saved.ok) return saved

  let uid = ''
  try {
    const created = await adminAuth().createUser({
      email: saved.email,
      password: saved.password,
      displayName: saved.name || undefined,
    })
    uid = created.uid
  } catch (error) {
    return { ok: false, message: authFailure(error, 'The account could not be created.') }
  }

  const driveFolderId = await clientFolder(saved.role, saved.companyName)
  try {
    await adminDb().collection('users').doc(uid).set({
      email: saved.email,
      name: saved.name,
      companyName: saved.companyName,
      driveFolderId,
      role: saved.role,
      onboardingDone: true,
      interfaceTheme: saved.interfaceTheme,
      ...(Object.keys(saved.themeColors).length > 0 ? { themeColors: saved.themeColors } : {}),
    })
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'The account could not be saved.')
    await adminAuth().deleteUser(uid).catch(() => undefined)
    return { ok: false, message: 'The account could not be saved.' }
  }
  return { ok: true, id: uid }
}

export async function updateAdminUser(input: UserInput & { id: string }): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can edit a user.' }
  if (!isDocId(input.id)) return { ok: false, message: 'That account could not be updated.' }
  const saved = readUser(input, false)
  if (!saved.ok) return saved
  if (admin.uid === input.id && saved.role !== 'admin') {
    return { ok: false, message: 'You cannot change your own role.' }
  }
  const kept = await keepAnAdmin(input.id, saved.role)
  if (!kept.ok) return kept

  const ref = adminDb().collection('users').doc(input.id)
  const existing = await ref.get()
  if (!existing.exists) return { ok: false, message: 'That account could not be updated.' }
  const currentFolder = existing.get('driveFolderId')
  const driveFolderId =
    typeof currentFolder === 'string' && currentFolder
      ? currentFolder
      : await clientFolder(saved.role, saved.companyName)

  try {
    await adminAuth().updateUser(input.id, {
      email: saved.email,
      displayName: saved.name || undefined,
      ...(saved.password ? { password: saved.password } : {}),
    })
  } catch (error) {
    if (authCode(error) !== 'auth/user-not-found') {
      return { ok: false, message: authFailure(error, 'The account could not be updated.') }
    }
  }

  await ref.set(
    {
      email: saved.email,
      name: saved.name,
      companyName: saved.companyName,
      driveFolderId,
      role: saved.role,
      interfaceTheme: saved.interfaceTheme,
      themeColors: Object.keys(saved.themeColors).length > 0 ? saved.themeColors : FieldValue.delete(),
    },
    { merge: true },
  )
  return { ok: true }
}

export async function deleteAdminUser(id: string): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can delete a user.' }
  if (!isDocId(id)) return { ok: false, message: 'That account could not be deleted.' }
  if (admin.uid === id) return { ok: false, message: 'You cannot delete your own account.' }
  const kept = await keepAnAdmin(id, 'client')
  if (!kept.ok) return kept

  try {
    await adminAuth().deleteUser(id)
  } catch (error) {
    if (authCode(error) !== 'auth/user-not-found') {
      return { ok: false, message: authFailure(error, 'The account could not be deleted.') }
    }
  }
  await adminDb().collection('users').doc(id).delete()
  return { ok: true }
}

async function keepAnAdmin(id: string, nextRole: AppRole): Promise<Result> {
  if (nextRole === 'admin') return { ok: true }
  const admins = await adminDb().collection('users').where('role', '==', 'admin').get()
  if (admins.docs.some((item) => item.id !== id)) return { ok: true }
  return { ok: false, message: 'Keep at least one admin.' }
}

async function clientFolder(role: AppRole, companyName: string): Promise<string> {
  if (role !== 'client' || !companyName || !ownerAccessConfigured()) return ''
  try {
    return (await createClientDriveFolder(companyName)).id
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'The client folder could not be created.')
    return ''
  }
}

function readUser(input: UserInput, creating: boolean): ({ ok: true } & SavedUser) | { ok: false; message: string } {
  const name = input.name.trim().slice(0, 80)
  const email = input.email.trim().toLowerCase()
  const role = readRole(input.role)
  const password = input.password
  if (!role) return { ok: false, message: 'Choose a role.' }
  if (!EMAIL.test(email) || email.length > 120) return { ok: false, message: 'Enter a valid email.' }
  if (password.length > 128) return { ok: false, message: 'Use a shorter password.' }
  if (creating && password.length < 6) return { ok: false, message: 'Use a password of at least 6 characters.' }
  if (!creating && password.length > 0 && password.length < 6) {
    return { ok: false, message: 'Use a password of at least 6 characters.' }
  }
  const company = input.companyName.trim()
  if (role === 'client' && !company) return { ok: false, message: 'Enter a company name.' }
  const companyName = company ? companyFolderName(company) : ''
  if (company && !companyName) return { ok: false, message: 'Enter a company name.' }
  const interfaceTheme = readInterfaceTheme(input.interfaceTheme)
  if (!interfaceTheme) return { ok: false, message: 'Choose an interface.' }
  const themeColors = readStoredPalette(input.themeColors, interfaceTheme)
  return { ok: true, name, email, companyName: companyName ?? '', role, password, interfaceTheme, themeColors }
}

function readRole(value: string): AppRole | null {
  switch (value) {
    case 'admin':
    case 'client':
      return value
    default:
      return null
  }
}

function authFailure(error: unknown, fallback: string): string {
  switch (authCode(error)) {
    case 'auth/email-already-exists':
      return 'That email already has an account.'
    case 'auth/invalid-email':
      return 'Enter a valid email.'
    case 'auth/invalid-password':
    case 'auth/weak-password':
      return 'Use a password of at least 6 characters.'
    default:
      console.error(error instanceof Error ? error.message : fallback)
      return fallback
  }
}

function authCode(error: unknown): string {
  if (!error || typeof error !== 'object' || !('code' in error)) return ''
  return typeof error.code === 'string' ? error.code : ''
}

function mapListedUser(id: string, data: Record<string, unknown>): AdminUser {
  const driveFolderId = data.driveFolderId
  const interfaceTheme = parseInterfaceTheme(data.interfaceTheme)
  return {
    id,
    email: textValue(data.email),
    name: textValue(data.name),
    companyName: textValue(data.companyName),
    role: parseRole(data.role),
    hasFolder: typeof driveFolderId === 'string' && driveFolderId.length > 0,
    interfaceTheme,
    logoFileId: textValue(data.logoFileId) || null,
    bannerFileId: textValue(data.bannerFileId) || null,
    themeColors: readStoredPalette(data.themeColors, interfaceTheme),
  }
}

function textValue(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function isDocId(value: string): boolean {
  return /^[A-Za-z0-9]{10,128}$/.test(value)
}
