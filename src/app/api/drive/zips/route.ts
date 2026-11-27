import { NextResponse } from 'next/server'
import { isDriveFileId } from '@/lib/drive/ids'
import { filterVisibleFileIds } from '@/lib/drive/library'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'
import { getSessionUser } from '@/lib/firebase/session'
import { enqueueJob } from '@/lib/jobs/queue'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const MAX_FILES = 40

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ message: 'Sign in to download.' }, { status: 401 })
  const folder = await driveFolderForCurrentUser()
  if (!folder) return NextResponse.json({ message: 'This account has no Drive folder.' }, { status: 404 })

  let fileIds: string[] = []
  let collectionId = ''
  try {
    const body: unknown = await request.json()
    if (body && typeof body === 'object') {
      if ('fileIds' in body && Array.isArray(body.fileIds)) {
        fileIds = [...new Set(body.fileIds.filter((id): id is string => typeof id === 'string' && isDriveFileId(id)))]
      }
      if ('collectionId' in body && typeof body.collectionId === 'string') collectionId = body.collectionId
    }
  } catch {
    return NextResponse.json({ message: 'The download could not be prepared.' }, { status: 400 })
  }
  if (fileIds.length < 2 || fileIds.length > MAX_FILES) {
    return NextResponse.json({ message: 'Choose between 2 and 40 files.' }, { status: 400 })
  }

  const visible = await filterVisibleFileIds(folder.id, fileIds)
  if (visible !== null) {
    if (visible.length < 2) {
      return NextResponse.json({ message: 'Those files are not available to download.' }, { status: 404 })
    }
    fileIds = visible
  }

  const jobId = await enqueueJob({
    kind: 'collection-zip',
    folderId: folder.id,
    uid: user.uid,
    collectionId,
    fileIds,
  })
  return NextResponse.json({ jobId }, { status: 202 })
}
