import 'server-only'
import { requireAdmin } from '@/lib/auth/admin'
import { isDriveFileId, readFileInFolder } from '@/lib/drive/client'
import { adminDb } from '@/lib/firebase/admin'

export type AdminAssetView = {
  title: string
  name: string
  collection: string
  mimeType: string
}

export async function loadAdminAsset(
  folderId: string,
  fileId: string,
): Promise<{ ok: true; asset: AdminAssetView } | { ok: false; reason: 'auth' | 'missing' }> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, reason: 'auth' }
  if (!isDriveFileId(folderId) || !isDriveFileId(fileId)) return { ok: false, reason: 'missing' }
  const owner = await adminDb().collection('users').where('driveFolderId', '==', folderId).limit(1).get()
  if (owner.empty) return { ok: false, reason: 'missing' }
  try {
    const file = await readFileInFolder(folderId, fileId)
    if (!file) return { ok: false, reason: 'missing' }
    return {
      ok: true,
      asset: {
        title: titleFromName(file.name),
        name: file.name,
        collection: file.collectionName,
        mimeType: file.mimeType,
      },
    }
  } catch {
    return { ok: false, reason: 'missing' }
  }
}

function titleFromName(name: string): string {
  const extension = name.lastIndexOf('.')
  const title = extension > 0 ? name.slice(0, extension) : name
  return title.replaceAll('_', ' ').trim() || name
}
