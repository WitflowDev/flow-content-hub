import 'server-only'
import { adminDb } from '@/lib/firebase/admin'
import { parseRole, type AppRole } from '@/lib/auth'

export type AccountProfile = {
  id: string
  email: string
  name: string
  companyName: string
  driveFolderId: string | null
  role: AppRole
  onboardingDone: boolean
}

export async function readUserProfile(uid: string): Promise<AccountProfile | null> {
  const snap = await adminDb().collection('users').doc(uid).get()
  if (!snap.exists) return null
  return mapProfile(snap.id, snap.data() ?? {})
}

export async function ensureUserProfile(user: { uid: string; email: string | null }): Promise<AccountProfile> {
  const existing = await readUserProfile(user.uid)
  if (existing) return existing
  const created: AccountProfile = {
    id: user.uid,
    email: user.email ?? '',
    name: '',
    companyName: '',
    driveFolderId: null,
    role: 'client',
    onboardingDone: false,
  }
  await adminDb().collection('users').doc(user.uid).set({
    email: created.email,
    name: created.name,
    companyName: created.companyName,
    driveFolderId: '',
    role: created.role,
    onboardingDone: created.onboardingDone,
  })
  return created
}

function mapProfile(id: string, data: Record<string, unknown>): AccountProfile {
  return {
    id,
    email: text(data.email),
    name: text(data.name),
    companyName: text(data.companyName),
    driveFolderId: text(data.driveFolderId) || null,
    role: parseRole(data.role),
    onboardingDone: data.onboardingDone === true,
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}
