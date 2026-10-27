import 'server-only'
import { createClient } from '@/lib/supabase/server'
import type { AccountNotice } from '@/lib/notifications/types'

export async function syncAccountNotices(input: {
  fileIds: string[]
  folderName: string | null
  hasFolder: boolean
}): Promise<void> {
  const supabase = await createClient()
  const { error } = await supabase.rpc('sync_account_notices', {
    p_file_ids: input.fileIds,
    p_folder_name: input.folderName ?? '',
    p_has_folder: input.hasFolder,
  })
  if (error) throw new Error(error.message)
}

export async function loadAccountNotices(): Promise<AccountNotice[]> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('notifications')
    .select('id, title, body, created_at, read_at')
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)

  return (data ?? []).map((row) => ({
    id: row.id,
    title: row.title,
    body: row.body,
    createdAt: row.created_at,
    unread: row.read_at == null,
  }))
}
