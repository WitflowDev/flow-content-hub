import 'server-only'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { reportError } from '@/lib/observe'

export type DownloadEvent = {
  id: string
  uid: string
  fileId: string
  collectionId: string
  name: string
  at: string
}

export async function recordDownload(input: {
  uid: string
  fileId: string
  collectionId: string
  name: string
}): Promise<void> {
  const event = {
    uid: input.uid,
    fileId: input.fileId,
    collectionId: input.collectionId,
    name: input.name,
    at: FieldValue.serverTimestamp(),
  }
  const db = adminDb()
  const userDownloads = db.collection('users').doc(input.uid).collection('drive_downloads').doc()
  const batch = db.batch()
  batch.set(db.collection('download_events').doc(userDownloads.id), event)
  batch.set(userDownloads, event)
  await batch.commit()
}

export async function listDownloadEvents(limit = 40): Promise<DownloadEvent[]> {
  try {
    const saved = await adminDb().collection('download_events').orderBy('at', 'desc').limit(limit).get()
    return saved.docs.map((doc) => ({
      id: doc.id,
      uid: text(doc.get('uid')),
      fileId: text(doc.get('fileId')),
      collectionId: text(doc.get('collectionId')),
      name: text(doc.get('name')),
      at: formatWhen(doc.get('at')),
    }))
  } catch (error) {
    reportError('downloads.list', error)
    return []
  }
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function formatWhen(value: unknown): string {
  const millis = value instanceof Timestamp ? value.toMillis() : 0
  if (!millis) return ''
  return new Intl.DateTimeFormat('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Lisbon',
  }).format(new Date(millis))
}
