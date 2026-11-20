'use server'

import { companyFolderName, createClientDriveFolder, ownerAccessConfigured } from '@/lib/drive/owner'
import { adminDb } from '@/lib/firebase/admin'
import { getSessionUser } from '@/lib/firebase/session'

type RegisterResult = { status: 'session' } | { status: 'error'; message: string }

export type SignupDetails = {
  companyName: string
  taxNumber: string
  address: string
  postalCode: string
}

export async function registerAccount(details: SignupDetails): Promise<RegisterResult> {
  const companyName = companyFolderName(details.companyName)
  if (!companyName) return { status: 'error', message: 'Enter a company name.' }

  const user = await getSessionUser()
  if (!user?.email) return { status: 'error', message: 'The account could not be saved.' }

  const ref = adminDb().collection('users').doc(user.uid)
  const existing = await ref.get()
  const savedFolder = existing.get('driveFolderId')
  if (typeof savedFolder === 'string' && savedFolder) return { status: 'session' }

  let driveFolderId = ''
  if (ownerAccessConfigured()) {
    try {
      driveFolderId = (await createClientDriveFolder(companyName)).id
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'The client folder could not be created.')
    }
  } else {
    console.error('Google Drive owner access is not configured.')
  }

  const savedName = existing.get('name')
  try {
    await ref.set(
      {
        email: user.email,
        name: typeof savedName === 'string' ? savedName : '',
        companyName,
        driveFolderId,
        role: existing.get('role') === 'admin' ? 'admin' : 'client',
        onboardingDone: existing.get('onboardingDone') === true,
      },
      { merge: true },
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'The account could not be saved.')
    return { status: 'error', message: 'The account could not be saved.' }
  }

  return { status: 'session' }
}
