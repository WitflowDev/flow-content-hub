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
  error: string
  filePath: string
}

const MAX_ATTEMPTS = 3

export async function enqueueJob(input: {
  kind: JobKind
  folderId: string
  uid: string
  collectionId?: string
  fileIds?: string[]
}): Promise<string> {
  const fixed = input.kind === 'collection-zip' || input.kind === 'press-kit' ? '' : `${input.kind}_${input.folderId}`
  const ref = fixed ? adminDb().collection('jobs').doc(fixed) : adminDb().collection('jobs').doc()
  if (fixed) {
    const existing = await ref.get()
    const status = existing.get('status')
    if (status === 'queued' || status === 'running') return ref.id
  }
  await ref.set({
    kind: input.kind,
    folderId: input.folderId,
    uid: input.uid,
    collectionId: input.collectionId ?? '',
    fileIds: input.fileIds ?? [],
    status: 'queued',
    attempts: 0,
    runAt: Date.now(),
    error: '',
    filePath: '',
  })
  return ref.id
}

export async function claimJob(): Promise<JobRecord | null> {
  const now = Date.now()
  const waiting = await adminDb().collection('jobs').where('status', '==', 'queued').limit(20).get()
  const next = waiting.docs
    .filter((doc) => numberField(doc.get('runAt')) <= now)
    .sort((left, right) => numberField(left.get('runAt')) - numberField(right.get('runAt')))[0]
  if (!next) return null
  return adminDb().runTransaction(async (tx) => {
    const snap = await tx.get(next.ref)
    if (snap.get('status') !== 'queued' || numberField(snap.get('runAt')) > Date.now()) return null
    const attempts = numberField(snap.get('attempts')) + 1
    tx.update(snap.ref, { status: 'running', attempts })
    return toRecord(snap.id, snap, attempts)
  })
}

export async function completeJob(id: string, filePath = ''): Promise<void> {
  await adminDb().collection('jobs').doc(id).update({
    status: 'done',
    error: '',
    filePath,
    finishedAt: Date.now(),
  })
}

export async function failJob(id: string, attempts: number, error: unknown): Promise<void> {
  const message = error instanceof Error ? error.message : 'The job failed.'
  const again = attempts < MAX_ATTEMPTS
  await adminDb().collection('jobs').doc(id).update({
    status: again ? 'queued' : 'error',
    error: message,
    runAt: Date.now() + attempts * 30_000,
  })
}

export async function readJob(id: string): Promise<JobRecord | null> {
  const snap = await adminDb().collection('jobs').doc(id).get()
  if (!snap.exists) return null
  return toRecord(snap.id, snap, numberField(snap.get('attempts')))
}

function toRecord(
  id: string,
  snap: DocumentSnapshot,
  attempts: number,
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
    fileIds: Array.isArray(fileIds) ? fileIds.filter((id): id is string => typeof id === 'string') : [],
    status: jobStatus(snap.get('status')),
    attempts,
    runAt: numberField(snap.get('runAt')),
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
