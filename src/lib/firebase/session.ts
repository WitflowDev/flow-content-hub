import 'server-only'
import { cache } from 'react'
import { cookies, headers } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { FLOW_EMAIL_HEADER, FLOW_UID_HEADER, SESSION_COOKIE } from '@/lib/firebase/config'

export type SessionUser = {
  uid: string
  email: string | null
}

const readVerifiedSession = cache(async function readVerifiedSession(): Promise<SessionUser | null> {
  const stamped = await stampedSession()
  if (stamped) return stamped
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    return { uid: decoded.uid, email: decoded.email ?? null }
  } catch {
    return null
  }
})

async function stampedSession(): Promise<SessionUser | null> {
  const headerStore = await headers()
  const uid = headerStore.get(FLOW_UID_HEADER)
  if (!uid) return null
  const email = headerStore.get(FLOW_EMAIL_HEADER)
  return { uid, email: email && email.length > 0 ? email : null }
}

export async function getSessionUser(): Promise<SessionUser | null> {
  return readVerifiedSession()
}
