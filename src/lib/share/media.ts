import 'server-only'
import { driveFolderForUser } from '@/lib/drive/resolve'
import { readAssetCopy } from '@/lib/drive/tags'
import { contentDisposition } from '@/lib/http/disposition'
import { embargoActive } from '@/lib/press'
import { readShare } from '@/lib/share/store'

export { contentDisposition }

export async function sharedFolderId(token: string): Promise<string | null> {
  const share = await readShare(token)
  return share?.folderId ?? null
}

export async function sharedContext(token: string): Promise<{ folderId: string; clientFolderId: string | null } | null> {
  const share = await readShare(token)
  if (!share) return null
  if (!share.ownerId) return { folderId: share.folderId, clientFolderId: null }
  const clientFolder = await driveFolderForUser(share.ownerId, null)
  return { folderId: share.folderId, clientFolderId: clientFolder?.id ?? null }
}

export async function sharedFileAllowed(fileId: string): Promise<boolean> {
  const copy = (await readAssetCopy([fileId])).get(fileId)
  if (!copy) return true
  return !embargoActive(copy.press.embargoUntil)
}
