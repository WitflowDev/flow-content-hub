import 'server-only'
import { clientFolderForEmail } from '@/lib/drive/access'
import { legacyFolderId, readFolderName } from '@/lib/drive/client'
import { createClient } from '@/lib/supabase/server'

export type DriveFolder = {
  id: string
  name: string
}

export async function driveFolderForUser(userId: string, email: string | null | undefined): Promise<DriveFolder | null> {
  const supabase = await createClient()
  const { data, error } = await supabase.from('profiles').select('drive_folder_id').eq('id', userId).maybeSingle()
  if (error) throw new Error(error.message)

  if (typeof data?.drive_folder_id === 'string' && data.drive_folder_id) {
    try {
      const name = await readFolderName(data.drive_folder_id)
      return { id: data.drive_folder_id, name }
    } catch {
      return null
    }
  }

  const legacy = clientFolderForEmail(email)
  if (!legacy) return null
  try {
    const id = await legacyFolderId(legacy)
    return { id, name: legacy.folderName }
  } catch {
    return null
  }
}

export async function driveFolderForCurrentUser(): Promise<DriveFolder | null> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null
  return driveFolderForUser(user.id, user.email)
}
