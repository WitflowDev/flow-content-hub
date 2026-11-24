import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { parseRole } from '@/lib/auth'
import { readUserProfile, type AccountProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'

export const PREVIEW_COOKIE = 'flow_preview'

const USER_ID = /^[A-Za-z0-9]{10,128}$/

export const readPreviewTarget = cache(async function readPreviewTarget(): Promise<AccountProfile | null> {
  const id = (await cookies()).get(PREVIEW_COOKIE)?.value ?? ''
  if (!USER_ID.test(id)) return null
  const session = await getSessionUser()
  if (!session || session.uid === id) return null
  const actor = await readUserProfile(session.uid)
  if (!actor || parseRole(actor.role) !== 'admin') return null
  return readUserProfile(id)
})
