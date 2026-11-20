'use server'

import { isDriveFileId, readDirectChildFolder } from '@/lib/drive/client'
import { readCollectionRecords } from '@/lib/drive/publish'
import { driveFolderForUser } from '@/lib/drive/resolve'
import { getSessionUser } from '@/lib/firebase/session'
import { ensureCollectionShare } from '@/lib/share/store'

type Result = { ok: true; token: string } | { ok: false; message: string }

export async function createCollectionShare(folderId: string): Promise<Result> {
  const user = await getSessionUser()
  if (!user) return { ok: false, message: 'Sign in to share a collection.' }
  if (!isDriveFileId(folderId)) return { ok: false, message: 'That collection is not available.' }
  const folder = await driveFolderForUser(user.uid, user.email)
  if (!folder) return { ok: false, message: 'This account has no Drive folder.' }
  try {
    const child = await readDirectChildFolder(folder.id, folderId)
    if (!child) return { ok: false, message: 'That collection is not available.' }
    const record = (await readCollectionRecords([child.id])).get(child.id)
    if (record && !record.published) return { ok: false, message: 'Publish the collection before sharing it.' }
    const token = await ensureCollectionShare(child.id)
    return { ok: true, token }
  } catch {
    return { ok: false, message: 'The share link could not be created.' }
  }
}
