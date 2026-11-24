import 'server-only'
import { readFolderName } from '@/lib/drive/client'
import { readUserProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'
import { readPreviewTarget } from '@/lib/preview'

export type DriveFolder = {
  id: string
  name: string
}

const FOLDER_TTL_MS = 60_000

const folderCache = new Map<string, { folder: DriveFolder; expires: number }>()
const folderInflight = new Map<string, Promise<DriveFolder | null>>()

export async function driveFolderForUser(
  userId: string,
  _email: string | null | undefined,
  knownFolderId?: string | null,
): Promise<DriveFolder | null> {
  const cached = readCachedFolder(userId, knownFolderId)
  if (cached) return cached

  const inflightKey =
    knownFolderId === undefined ? `${userId}:lookup` : `${userId}:${knownFolderId ?? 'none'}`
  const pending = folderInflight.get(inflightKey)
  if (pending) return pending

  const next = resolveDriveFolder(userId, knownFolderId)
    .then((folder) => {
      if (folder) folderCache.set(userId, { folder, expires: Date.now() + FOLDER_TTL_MS })
      return folder
    })
    .finally(() => {
      folderInflight.delete(inflightKey)
    })
  folderInflight.set(inflightKey, next)
  return next
}

function readCachedFolder(userId: string, knownFolderId: string | null | undefined): DriveFolder | null {
  const cached = folderCache.get(userId)
  if (!cached || cached.expires <= Date.now()) return null
  if (knownFolderId === undefined || knownFolderId === cached.folder.id) return cached.folder
  return null
}

async function resolveDriveFolder(
  userId: string,
  knownFolderId: string | null | undefined,
): Promise<DriveFolder | null> {
  const folderId = knownFolderId === undefined ? await savedFolderId(userId) : knownFolderId
  if (!folderId) return null
  try {
    const name = await readFolderName(folderId)
    return { id: folderId, name }
  } catch {
    return null
  }
}

async function savedFolderId(userId: string): Promise<string | null> {
  const profile = await readUserProfile(userId)
  return profile?.driveFolderId ?? null
}

export async function driveFolderForCurrentUser(): Promise<DriveFolder | null> {
  const user = await getSessionUser()
  if (!user) return null
  const preview = await readPreviewTarget()
  if (preview) return driveFolderForUser(preview.id, preview.email, preview.driveFolderId)
  return driveFolderForUser(user.uid, user.email)
}
