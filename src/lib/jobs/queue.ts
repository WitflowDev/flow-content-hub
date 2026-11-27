import 'server-only'
import type { DocumentSnapshot } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'

export const JOB_KINDS = ['sync-library', 'warm-thumbnails', 'collection-zip', 'press-kit'] as const

export type JobKind = (typeof JOB_KINDS)[number]
export type JobStatus = 'queued' | 'running' | 'done' | 'error'

export type JobRecord = {
  id: string
  kind: JobKind
  folderId: string
  uid: string
  collectionId: string
  fileIds: string[]
  status: JobStatus
  attempts: number
  runAt: number
  leaseUntil: number
  error: string
  filePath: string
}

const MAX_ATTEMPTS = 3
const LEASE_MS = 5 * 60 * 1000
const JOB_ID_PATTERN = /^[A-Za-z0-9_-]{1,128}$/

export async function enqueueJob(input: {
  kind: JobKind
  folderId: string
  uid: string
  collectionId?: string
  fileIds?: string[]
}): Promise<string> {
  const db = adminDb()
  const fixed = input.kind === 'collection-zip' || input.kind === 'press-kit' ? '' : `${input.kind}_${input.folderId}`
  const ref = fixed ? db.collection('jobs').doc(fixed) : db.collection('jobs').doc()

  const payload = {
    kind: input.kind,
    folderId: input.folderId,
    uid: input.uid,
    collectionId: input.collectionId ?? '',
    fileIds: input.fileIds ?? [],
    status: 'queued' as const,
    attempts: 0,
    runAt: Date.now(),
    leaseUntil: 0,
    error: '',
    filePath: '',
  }

  if (!fixed) {
    await ref.set(payload)
    return ref.id
  }

  await db.runTransaction(async (tx) => {
    const existing = await tx.get(ref)
    if (existing.exists) {
      const status = existing.get('status')
      const leaseUntil = numberField(existing.get('leaseUntil'))
      const now = Date.now()
      if (status === 'queued') return
      if (status === 'running' && leaseUntil > now) return
    }
    tx.set(ref, payload)
  })
  return ref.id
}

export async function claimJob(): Promise<JobRecord | null> {
  const db = adminDb()
  const now = Date.now()
  const [waitingSnap, runningSnap] = await Promise.all([
    db.collection('jobs').where('status', '==', 'queued').limit(50).get(),
    db.collection('jobs').where('status', '==', 'running').limit(20).get(),
  ])

  const readyQueued = waitingSnap.docs
    .filter((doc) => numberField(doc.get('runAt')) <= now)
    .sort((left, right) => numberField(left.get('runAt')) - numberField(right.get('runAt')))

  const expiredRunning = runningSnap.docs
    .filter((doc) => numberField(doc.get('leaseUntil')) <= now)
    .sort((left, right) => numberField(left.get('leaseUntil')) - numberField(right.get('leaseUntil')))

  const candidate = readyQueued[0] ?? expiredRunning[0]
  if (!candidate) return null
  return claimSpecificJob(candidate.id)
}

export async function claimSpecificJob(id: string): Promise<JobRecord | null> {
  if (!JOB_ID_PATTERN.test(id)) return null
  const db = adminDb()
  const ref = db.collection('jobs').doc(id)
  return db.runTransaction(async (tx) => {
    const snap = await tx.get(ref)
    if (!snap.exists) return null
    const now = Date.now()
    const status = snap.get('status')
    const runAt = numberField(snap.get('runAt'))
    const leaseUntil = numberField(snap.get('leaseUntil'))
    const isQueuedReady = status === 'queued' && runAt <= now
    const isExpiredRunning = status === 'running' && leaseUntil <= now
    if (!isQueuedReady && !isExpiredRunning) return null
    const attempts = numberField(snap.get('attempts')) + 1
    const nextLease = now + LEASE_MS
    tx.update(snap.ref, { status: 'running', attempts, leaseUntil: nextLease })
    return toRecord(snap.id, snap, attempts, nextLease)
  })
}

export async function completeJob(id: string, filePath = ''): Promise<void> {
  await adminDb().collection('jobs').doc(id).update({
    status: 'done',
    error: '',
    filePath,
    leaseUntil: 0,
    finishedAt: Date.now(),
  })
}

export async function requeueJob(id: string, delayMs = 1000): Promise<void> {
  await adminDb().collection('jobs').doc(id).update({
    status: 'queued',
    error: '',
    leaseUntil: 0,
    attempts: 0,
    runAt: Date.now() + delayMs,
  })
}

export async function failJob(id: string, attempts: number, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'The job failed.'
  const again = attempts < MAX_ATTEMPTS
  await adminDb().collection('jobs').doc(id).update({
    status: again ? 'queued' : 'error',
    error: message,
    leaseUntil: 0,
    runAt: Date.now() + attempts * 30_000,
  })
}

export async function readJob(id: string): Promise<JobRecord | null> {
  if (!JOB_ID_PATTERN.test(id)) return null
  const snap = await adminDb().collection('jobs').doc(id).get()
  if (!snap.exists) return null
  return toRecord(snap.id, snap, numberField(snap.get('attempts')), numberField(snap.get('leaseUntil')))
}

function toRecord(
  id: string,
  snap: DocumentSnapshot,
  attempts: number,
  leaseUntil: number,
): JobRecord | null {
  const kind = snap.get('kind')
  if (!isJobKind(kind)) return null
  const fileIds = snap.get('fileIds')
  return {
    id,
    kind,
    folderId: text(snap.get('folderId')),
    uid: text(snap.get('uid')),
    collectionId: text(snap.get('collectionId')),
    fileIds: Array.isArray(fileIds) ? fileIds.filter((item): item is string => typeof item === 'string') : [],
    status: jobStatus(snap.get('status')),
    attempts,
    runAt: numberField(snap.get('runAt')),
    leaseUntil,
    error: text(snap.get('error')),
    filePath: text(snap.get('filePath')),
  }
}

function isJobKind(value: unknown): value is JobKind {
  return typeof value === 'string' && (JOB_KINDS as readonly string[]).includes(value)
}

function jobStatus(value: unknown): JobStatus {
  switch (value) {
    case 'queued':
    case 'running':
    case 'done':
    case 'error':
      return value
    default:
      return 'error'
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function numberField(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}
