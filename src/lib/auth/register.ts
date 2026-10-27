'use server'

import { companyFolderName, createClientDriveFolder, ownerAccessConfigured } from '@/lib/drive/owner'
import { createServiceClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'

type RegisterResult =
  | { status: 'session' }
  | { status: 'confirm' }
  | { status: 'error'; message: string }

export type SignupDetails = {
  companyName: string
  taxNumber: string
  address: string
  postalCode: string
}

export async function registerAccount(email: string, password: string, details: SignupDetails): Promise<RegisterResult> {
  const trimmed = email.trim().toLowerCase()
  const companyName = companyFolderName(details.companyName)
  if (!trimmed.includes('@') || password.length < 6) {
    return { status: 'error', message: 'Enter an email and a password of at least 6 characters.' }
  }
  if (!companyName) return { status: 'error', message: 'Enter a company name.' }
  if (!ownerAccessConfigured()) {
    return { status: 'error', message: 'Google Drive owner access is not configured.' }
  }
  if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SECRET_KEY) {
    return { status: 'error', message: 'The account could not be saved.' }
  }

  const supabase = await createClient()
  const { data, error } = await supabase.auth.signUp({ email: trimmed, password })
  if (error) return { status: 'error', message: error.message }
  if (!data.user || data.user.identities?.length === 0) return { status: 'confirm' }

  let folder: { id: string }
  try {
    folder = await createClientDriveFolder(companyName)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The client folder could not be created.'
    console.error(message)
    return { status: 'error', message }
  }

  try {
    const admin = createServiceClient()
    const { data: saved, error: saveError } = await admin
      .from('profiles')
      .update({
        email: trimmed,
        drive_folder_id: folder.id,
        company_name: companyName,
        tax_number: blankToNull(details.taxNumber),
        address: blankToNull(details.address),
        postal_code: blankToNull(details.postalCode),
      })
      .eq('id', data.user.id)
      .is('drive_folder_id', null)
      .select('id')
    if (saveError || !saved?.length) {
      return { status: 'error', message: 'The account was created, but the content folder could not be saved.' }
    }
  } catch {
    return { status: 'error', message: 'The account was created, but the content folder could not be saved.' }
  }

  return data.session ? { status: 'session' } : { status: 'confirm' }
}

function blankToNull(value: string): string | null {
  const trimmed = value.trim()
  return trimmed || null
}
