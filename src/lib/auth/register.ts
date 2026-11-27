'use server'

import { companyFolderName, createClientDriveFolder, ownerAccessConfigured } from '@/lib/drive/owner'
import { adminDb } from '@/lib/firebase/admin'
import { getSessionUser } from '@/lib/firebase/session'
import { syncAccountNotices } from '@/lib/notifications/sync'

type RegisterResult = { status: 'session' } | { status: 'error'; message: string }

export type SignupDetails = {
  companyName: string
  taxNumber: string
  address: string
  postalCode: string
}

const PROVISION_LOCK_MS = 2 * 60 * 1000

export async function registerAccount(details: SignupDetails): Promise<RegisterResult> {
  const companyName = companyFolderName(details.companyName)
  if (!companyName) return { status: 'error', message: 'Enter a company name.' }

  const user = await getSessionUser()
  if (!user?.email) return { status: 'error', message: 'The account could not be saved.' }

  const ref = adminDb().collection('users').doc(user.uid)
  const claimed = await adminDb().runTransaction(async (tx) => {
    const existing = await tx.get(ref)
    const savedFolder = existing.get('driveFolderId')
    if (typeof savedFolder === 'string' && savedFolder) {
      return { state: 'ready' as const, savedName: existing.get('name'), role: existing.get('role'), onboardingDone: existing.get('onboardingDone') }
    }
    const lockUntil = existing.get('folderProvisioningUntil')
    if (typeof lockUntil === 'number' && lockUntil > Date.now()) {
      return { state: 'locked' as const, savedName: existing.get('name'), role: existing.get('role'), onboardingDone: existing.get('onboardingDone') }
    }
    tx.set(ref, { folderProvisioningUntil: Date.now() + PROVISION_LOCK_MS }, { merge: true })
    return { state: 'provision' as const, savedName: existing.get('name'), role: existing.get('role'), onboardingDone: existing.get('onboardingDone') }
  })

  if (claimed.state === 'ready') return { status: 'session' }
  if (claimed.state === 'locked') {
    return { status: 'error', message: 'Your account is still being set up. Try again in a moment.' }
  }

  let driveFolderId = ''
  if (ownerAccessConfigured()) {
    try {
      driveFolderId = (await createClientDriveFolder(companyName)).id
    } catch (error) {
      await ref.set({ folderProvisioningUntil: 0 }, { merge: true }).catch(() => undefined)
      const message = error instanceof Error ? error.message : 'The client folder could not be created.'
      console.error(message)
      return { status: 'error', message: 'Your content folder could not be created. Try again in a moment.' }
    }
  } else {
    console.error('Google Drive owner access is not configured.')
  }

  try {
    await ref.set(
      {
        email: user.email,
        name: typeof claimed.savedName === 'string' ? claimed.savedName : '',
        companyName,
        taxNumber: cleanDetail(details.taxNumber, 40),
        address: cleanDetail(details.address, 200),
        postalCode: cleanDetail(details.postalCode, 30),
        driveFolderId,
        folderProvisioningUntil: 0,
        role: claimed.role === 'admin' ? 'admin' : 'client',
        onboardingDone: claimed.onboardingDone === true,
      },
      { merge: true },
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'The account could not be saved.')
    return { status: 'error', message: 'The account could not be saved.' }
  }

  if (driveFolderId) {
    try {
      await syncAccountNotices(user.uid, { fileIds: [], folderName: companyName, hasFolder: true })
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'The library notice could not be saved.')
    }
  }

  return { status: 'session' }
}

function cleanDetail(value: string, maxLength: number): string {
  return value.trim().slice(0, maxLength)
}
