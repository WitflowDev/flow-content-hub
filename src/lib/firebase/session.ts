import 'server-only'
import { cache } from 'react'
import { cookies } from 'next/headers'
import { adminAuth } from '@/lib/firebase/admin'
import { SESSION_COOKIE } from '@/lib/firebase/config'

export type SessionUser = {
  uid: string
  email: string | null
}

const readVerifiedSession = cache(async function readVerifiedSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(SESSION_COOKIE)?.value
  if (!token) return null
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    return { uid: decoded.uid, email: decoded.email ?? null }
  } catch {
    return null
  }
})

export async function getSessionUser(): Promise<SessionUser | null> {
  return readVerifiedSession()
}
