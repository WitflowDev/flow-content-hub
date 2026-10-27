'use server'

import { roleFromAppMetadata } from '@/lib/auth'
import { createServiceClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import type { PromotionResult } from '@/lib/notifications/types'

const TITLE_LIMIT = 120
const MESSAGE_LIMIT = 500

export async function markNotificationsRead(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  const { error } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('profile_id', user.id)
    .is('read_at', null)
  if (error) throw new Error(error.message)
}

export async function sendPromotion(input: { title: string; message: string; audience: string }): Promise<PromotionResult> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || roleFromAppMetadata(user.app_metadata) !== 'admin') {
    return { ok: false, message: 'Only an admin can send a promotion.' }
  }

  const title = input.title.trim()
  const message = input.message.trim()
  if (!title || !message) return { ok: false, message: 'Write a title and a message.' }
  if (title.length > TITLE_LIMIT || message.length > MESSAGE_LIMIT) {
    return { ok: false, message: 'Use a shorter title or message.' }
  }

  let service: ReturnType<typeof createServiceClient>
  try {
    service = createServiceClient()
  } catch {
    return { ok: false, message: 'The promotion could not be sent.' }
  }
  const accounts = await service.from('profiles').select('id')
  if (accounts.error) return { ok: false, message: 'The promotion could not be sent.' }

  const ids = (accounts.data ?? []).map((row) => row.id)
  const targets = input.audience === 'all' ? ids : ids.filter((id) => id === input.audience)
  if (targets.length === 0) return { ok: false, message: 'Choose an account.' }

  const rows = targets.map((profileId) => ({
    profile_id: profileId,
    kind: 'promotion',
    title,
    body: message,
  }))
  const inserted = await service.from('notifications').insert(rows)
  if (inserted.error) return { ok: false, message: 'The promotion could not be sent.' }
  return { ok: true }
}
