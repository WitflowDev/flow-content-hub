import 'server-only'
import { FieldValue } from 'firebase-admin/firestore'
import {
  isContentDayPlan,
  parseDateKey,
  type ContentDayPlanId,
  type ContentDayRequest,
  type ContentDayRequestStatus,
} from '@/lib/content-day'
import { adminDb } from '@/lib/firebase/admin'

const COLLECTION = 'contentDayRequests'
const DOC_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

export async function saveContentDayRequest(input: {
  accountId: string
  name: string
  email: string
  company: string
  plan: ContentDayPlanId
  date: string
}): Promise<void> {
  const db = adminDb()
  await db.runTransaction(async (tx) => {
    const query = db
      .collection(COLLECTION)
      .where('accountId', '==', input.accountId)
      .where('status', '==', 'requested')
      .limit(1)
    const existing = await tx.get(query)
    const ref = existing.docs[0]?.ref ?? db.collection(COLLECTION).doc()
    tx.set(ref, {
      accountId: input.accountId,
      name: input.name,
      email: input.email,
      company: input.company,
      plan: input.plan,
      date: input.date,
      status: 'requested',
      createdAt: FieldValue.serverTimestamp(),
      eventId: '',
    })
  })
}

export async function listRequestedContentDays(): Promise<ContentDayRequest[]> {
  const snap = await adminDb().collection(COLLECTION).where('status', '==', 'requested').limit(50).get()
  return snap.docs.flatMap((item) => {
    const row = readRequest(item.id, item.data() as Record<string, unknown>)
    return row ? [row] : []
  })
}

export async function claimContentDayForConfirm(id: string): Promise<ContentDayRequest | null> {
  if (!DOC_ID_PATTERN.test(id)) return null
  const db = adminDb()
  const ref = db.collection(COLLECTION).doc(id)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return null
    const row = readRequest(snap.id, (snap.data() ?? {}) as Record<string, unknown>)
    if (!row || row.status !== 'requested') return null
    tx.set(ref, { status: 'confirming' }, { merge: true })
    return row
  })
}

export async function releaseContentDayClaim(id: string): Promise<void> {
  if (!DOC_ID_PATTERN.test(id)) return
  const db = adminDb()
  const ref = db.collection(COLLECTION).doc(id)
  await db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists || snap.get('status') !== 'confirming') return
    tx.set(ref, { status: 'requested' }, { merge: true })
  })
}

export async function requestedContentDay(id: string): Promise<ContentDayRequest | null> {
  if (!DOC_ID_PATTERN.test(id)) return null
  const snap = await adminDb().collection(COLLECTION).doc(id).get()
  if (!snap.exists) return null
  const row = readRequest(snap.id, (snap.data() ?? {}) as Record<string, unknown>)
  if (!row || row.status !== 'requested') return null
  return row
}

export async function markContentDayConfirmed(id: string, eventId: string): Promise<void> {
  if (!DOC_ID_PATTERN.test(id)) return
  await adminDb().collection(COLLECTION).doc(id).set(
    {
      status: 'confirmed',
      eventId,
      confirmedAt: FieldValue.serverTimestamp(),
    },
    { merge: true },
  )
}

function readRequest(id: string, data: Record<string, unknown>): ContentDayRequest | null {
  const plan = text(data.plan)
  const date = text(data.date)
  const status = text(data.status)
  if (!isContentDayPlan(plan) || !parseDateKey(date)) return null
  if (!isRequestStatus(status)) return null
  const name = text(data.name)
  const email = text(data.email)
  const company = text(data.company)
  const accountId = text(data.accountId)
  if (!name || !email || !company || !accountId) return null
  return { id, accountId, name, email, company, plan, date, status }
}

function isRequestStatus(value: string): value is ContentDayRequestStatus {
  switch (value) {
    case 'requested':
    case 'confirmed':
      return true
    default:
      return false
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}
