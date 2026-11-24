'use server'

import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { requireAdmin } from '@/lib/auth/admin'
import { readUserProfile } from '@/lib/firebase/profile'
import { PREVIEW_COOKIE } from '@/lib/preview'

const USER_ID = /^[A-Za-z0-9]{10,128}$/

export async function startPreview(userId: string): Promise<{ ok: false; message: string } | undefined> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can preview an account.' }
  if (!USER_ID.test(userId) || userId === admin.uid) {
    return { ok: false, message: 'That account cannot be previewed.' }
  }
  const profile = await readUserProfile(userId)
  if (!profile) return { ok: false, message: 'That account could not be opened.' }
  const jar = await cookies()
  jar.set(PREVIEW_COOKIE, userId, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  })
  redirect('/home')
}

export async function stopPreview(): Promise<void> {
  const jar = await cookies()
  jar.delete(PREVIEW_COOKIE)
  redirect('/admin')
}
