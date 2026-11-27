import 'server-only'
import { FieldValue, type Timestamp } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'
import { getFastSessionUser } from '@/lib/firebase/session'
import type { AccountNotice } from '@/lib/notifications/types'

const NEW_FILE_LIMIT = 25
const NOTICE_LIST_LIMIT = 50

export async function syncAccountNotices(
  userId: string,
  input: {
    fileIds: string[]
    folderName: string | null
    hasFolder: boolean
  },
): Promise<void> {
  if (!userId) return
  const db = adminDb()
  const notices = db.collection('users').doc(userId).collection('notifications')
  const existing = await notices.select().get()
  const ids = new Set(existing.docs.map((item) => item.id))

  const batch = db.batch()
  let writes = 0

  const folderNoticeId = input.hasFolder ? 'folder-ready' : 'folder-missing'
  if (!ids.has(folderNoticeId)) {
    batch.set(notices.doc(folderNoticeId), {
      kind: 'library',
      title: input.hasFolder ? 'Your library is ready' : 'Your content folder is not connected',
      body: input.hasFolder
        ? `Files from ${input.folderName || 'your folder'} are available in My Content.`
        : 'Ask Flow to connect a Drive folder to this account.',
      createdAt: FieldValue.serverTimestamp(),
      readAt: null,
    })
    writes += 1
  }

  if (input.hasFolder) {
    const missing = input.fileIds.filter((fileId) => !ids.has(`file:${fileId}`)).slice(0, NEW_FILE_LIMIT)
    for (const fileId of missing) {
      batch.set(notices.doc(`file:${fileId}`), {
        kind: 'content',
        title: 'New content is available',
        body: `A new file was added to ${input.folderName || 'your library'}.`,
        createdAt: FieldValue.serverTimestamp(),
        readAt: null,
      })
      writes += 1
    }
  }

  if (writes > 0) await batch.commit()
}

export async function loadAccountNotices(): Promise<AccountNotice[]> {
  const user = await getFastSessionUser()
  if (!user) return []
  const snap = await adminDb()
    .collection('users')
    .doc(user.uid)
    .collection('notifications')
    .orderBy('createdAt', 'desc')
    .limit(NOTICE_LIST_LIMIT)
    .get()
  return snap.docs
    .map((item) => ({
      id: item.id,
      title: text(item.get('title')),
      body: text(item.get('body')),
      createdAt: timestampToIso(item.get('createdAt')),
      unread: item.get('readAt') == null,
    }))
    .filter((item) => item.title)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function timestampToIso(value: unknown): string {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate().toISOString()
  }
  return ''
}
