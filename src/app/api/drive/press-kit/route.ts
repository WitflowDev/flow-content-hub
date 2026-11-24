import { NextResponse } from 'next/server'
import { isDriveFileId } from '@/lib/drive/ids'
import { readLibraryIndex } from '@/lib/library-index/store'
import { driveFolderForUser } from '@/lib/drive/resolve'
import { getSessionUser } from '@/lib/firebase/session'
import { enqueueJob } from '@/lib/jobs/queue'
import { embargoActive } from '@/lib/press'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ message: 'Sign in to download.' }, { status: 401 })
  const folder = await driveFolderForUser(user.uid, user.email)
  if (!folder) return NextResponse.json({ message: 'This account has no Drive folder.' }, { status: 404 })

  let fileId = ''
  try {
    const body: unknown = await request.json()
    if (body && typeof body === 'object' && 'fileId' in body && typeof body.fileId === 'string') fileId = body.fileId
  } catch {
    return NextResponse.json({ message: 'The press kit could not be prepared.' }, { status: 400 })
  }
  if (!isDriveFileId(fileId)) return NextResponse.json({ message: 'That file is not available.' }, { status: 404 })

  const indexed = await readLibraryIndex(folder.id)
  const item = indexed?.snapshot.items.find((entry) => entry.driveFileId === fileId)
  if (!item?.captionApproved || !item.credit || embargoActive(item.embargoUntil ?? '')) {
    return NextResponse.json({ message: 'This file is not cleared for a press kit.' }, { status: 404 })
  }

  const jobId = await enqueueJob({
    kind: 'press-kit',
    folderId: folder.id,
    uid: user.uid,
    fileIds: [fileId],
  })
  return NextResponse.json({ jobId }, { status: 202 })
}
