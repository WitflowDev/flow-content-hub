'use server'

import { FieldValue } from 'firebase-admin/firestore'
import { parseRole } from '@/lib/auth'
import { adminDb } from '@/lib/firebase/admin'
import { readUserProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'
import type { PromotionResult } from '@/lib/notifications/types'

const TITLE_LIMIT = 120
const MESSAGE_LIMIT = 500
const BATCH_LIMIT = 400

export async function markNotificationsRead(): Promise<void> {
  const user = await getSessionUser()
  if (!user) return
  const snap = await adminDb().collection('users').doc(user.uid).collection('notifications').get()
  const unread = snap.docs.filter((item) => item.get('readAt') == null)
  if (unread.length === 0) return

  let batch = adminDb().batch()
  let pending = 0
  for (const item of unread) {
    batch.update(item.ref, { readAt: FieldValue.serverTimestamp() })
    pending += 1
    if (pending === BATCH_LIMIT) {
      await batch.commit()
      batch = adminDb().batch()
      pending = 0
    }
  }
  if (pending > 0) await batch.commit()
}

export async function sendPromotion(input: { title: string; message: string; audience: string }): Promise<PromotionResult> {
  const user = await getSessionUser()
  if (!user) return { ok: false, message: 'Only an admin can send a promotion.' }

  const profile = await readUserProfile(user.uid)
  if (!profile || parseRole(profile.role) !== 'admin') {
    return { ok: false, message: 'Only an admin can send a promotion.' }
  }

  const title = input.title.trim()
  const message = input.message.trim()
  if (!title || !message) return { ok: false, message: 'Write a title and a message.' }
  if (title.length > TITLE_LIMIT || message.length > MESSAGE_LIMIT) {
    return { ok: false, message: 'Use a shorter title or message.' }
  }

  const accounts = await adminDb().collection('users').get()
  const ids = accounts.docs.map((item) => item.id)
  const targets = input.audience === 'all' ? ids : ids.filter((id) => id === input.audience)
  if (targets.length === 0) return { ok: false, message: 'Choose an account.' }

  let batch = adminDb().batch()
  let pending = 0
  for (const uid of targets) {
    const notice = adminDb().collection('users').doc(uid).collection('notifications').doc()
    batch.set(notice, {
      kind: 'promotion',
      title,
      body: message,
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
    })
    pending += 1
    if (pending === BATCH_LIMIT) {
      await batch.commit()
      batch = adminDb().batch()
      pending = 0
    }
  }
  if (pending > 0) await batch.commit()
  return { ok: true }
}
