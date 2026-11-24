'use server'

import { exportFormat } from '@/data/exports'
import { requireAdmin } from '@/lib/auth/admin'
import { isDriveFileId, listClientFolder } from '@/lib/drive/client'
import { readAssetCopy } from '@/lib/drive/tags'
import { readUserProfile } from '@/lib/firebase/profile'
import { suggestFromArchive, type PressLicense } from '@/lib/press'

type Suggestion =
  | { ok: true; caption: string; credit: string; license: PressLicense | ''; formatLabel: string }
  | { ok: false; message: string }

export async function suggestArchiveFields(input: { accountId: string; fileId: string }): Promise<Suggestion> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can ask for a suggestion.' }
  if (!isDriveFileId(input.fileId)) return { ok: false, message: 'That file is not available.' }
  const profile = await readUserProfile(input.accountId)
  if (!profile?.driveFolderId) return { ok: false, message: 'This account has no archive.' }
  try {
    const listed = await listClientFolder(profile.driveFolderId)
    const file = listed.files.find((item) => item.id === input.fileId)
    if (!file) return { ok: false, message: 'That file is not in this account.' }
    const copy = await readAssetCopy(listed.files.map((item) => item.id), input.accountId)
    const approved = listed.files.flatMap((item) => {
      if (item.id === file.id) return []
      const saved = copy.get(item.id)
      if (!saved?.press.captionApproved || !saved.suggestedUse) return []
      return [{ caption: saved.suggestedUse, credit: saved.press.credit, license: saved.press.license }]
    })
    const suggestion = suggestFromArchive({
      title: file.name,
      collection: file.collectionName ?? '',
      width: file.width,
      height: file.height,
      approved,
    })
    const format = exportFormat(suggestion.format)
    return {
      ok: true,
      caption: suggestion.caption,
      credit: suggestion.credit,
      license: suggestion.license,
      formatLabel: format?.label ?? 'Post',
    }
  } catch {
    return { ok: false, message: 'This archive could not be read.' }
  }
}
