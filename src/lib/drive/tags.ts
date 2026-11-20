import 'server-only'
import { isDriveFileId } from '@/lib/drive/client'
import { adminDb } from '@/lib/firebase/admin'
import { parseTags } from '@/lib/tags'

const READ_BATCH = 100

export type AssetCopy = {
  tags: string[]
  suggestedUse: string
}

export async function readAssetCopy(fileIds: string[]): Promise<Map<string, AssetCopy>> {
  const ids = [...new Set(fileIds.filter(isDriveFileId))]
  const copy = new Map<string, AssetCopy>()
  if (ids.length === 0) return copy
  const db = adminDb()
  for (let index = 0; index < ids.length; index += READ_BATCH) {
    const slice = ids.slice(index, index + READ_BATCH)
    const snaps = await db.getAll(...slice.map((id) => db.collection('assets').doc(id)))
    for (const snap of snaps) {
      const saved = snap.get('tags')
      const tags = Array.isArray(saved)
        ? parseTags(saved.filter((tag): tag is string => typeof tag === 'string').join(', '))
        : []
      const suggestedUse = cleanUse(snap.get('suggestedUse'))
      if (tags.length === 0 && !suggestedUse) continue
      copy.set(snap.id, { tags, suggestedUse })
    }
  }
  return copy
}

export async function saveAssetCopy(
  fileId: string,
  accountId: string,
  tags: string[],
  suggestedUse: string,
): Promise<void> {
  const use = cleanUse(suggestedUse)
  if (!isDriveFileId(fileId)) return
  await adminDb().collection('assets').doc(fileId).set(
    {
      profileId: accountId,
      driveFileId: fileId,
      tags,
      suggestedUse: use,
    },
    { merge: true },
  )
}

export async function deleteAssetCopy(fileId: string): Promise<void> {
  if (!isDriveFileId(fileId)) return
  await adminDb().collection('assets').doc(fileId).delete()
}

function cleanUse(value: unknown): string {
  if (typeof value !== 'string') return ''
  return value.trim().slice(0, 500)
}
