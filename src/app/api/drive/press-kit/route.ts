import { after, NextResponse } from 'next/server'
import { recordDownload } from '@/lib/admin/downloads'
import { prepareClientZipEntries } from '@/lib/drive/client'
import { isDriveFileId } from '@/lib/drive/ids'
import { readVisibleLibraryItem } from '@/lib/drive/library'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'
import { getSessionUser } from '@/lib/firebase/session'
import { contentDisposition } from '@/lib/http/disposition'
import { enqueueJob } from '@/lib/jobs/queue'
import { reportError } from '@/lib/observe'
import { embargoActive, pressText } from '@/lib/press'
import { readPreviewTarget } from '@/lib/preview'
import { bytesToStream, createZipStream } from '@/lib/zipStream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function GET(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ message: 'Sign in to download.' }, { status: 401 })
  const folder = await driveFolderForCurrentUser()
  if (!folder) return NextResponse.json({ message: 'This account has no Drive folder.' }, { status: 404 })

  const fileId = new URL(request.url).searchParams.get('fileId') ?? ''
  if (!isDriveFileId(fileId)) return NextResponse.json({ message: 'That file is not available.' }, { status: 404 })

  const item = await readVisibleLibraryItem(folder.id, fileId)
  if (!item?.captionApproved || !item.credit || embargoActive(item.embargoUntil ?? '')) {
    return NextResponse.json({ message: 'This file is not cleared for a press kit.' }, { status: 404 })
  }

  const entries = await prepareClientZipEntries(folder.id, [fileId])
  const mediaEntry = entries[0]
  if (!mediaEntry) return NextResponse.json({ message: 'That file is not available.' }, { status: 404 })

  const noteBytes = new TextEncoder().encode(
    pressText({
      caption: item.description,
      credit: item.credit,
      license: item.license ?? '',
      embargoUntil: item.embargoUntil ?? '',
    }),
  )

  const preview = await readPreviewTarget()
  if (!preview) {
    const uid = user.uid
    after(async () => {
      await recordDownload({
        uid,
        fileId: mediaEntry.id,
        collectionId: mediaEntry.collectionId,
        name: mediaEntry.name,
      }).catch((error: unknown) => reportError('downloads.record', error))
    })
  }

  const archiveStem = (item.title || 'press-kit')
    .replace(/[\r\n"/\\:*?<>|]+/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 64)
  const archiveName = `${archiveStem || 'press-kit'}_press_kit.zip`

  const stream = createZipStream([
    mediaEntry,
    {
      name: 'caption.txt',
      expectedSize: noteBytes.byteLength,
      open: async () => bytesToStream(noteBytes),
    },
  ])

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': contentDisposition(archiveName, false),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ message: 'Sign in to download.' }, { status: 401 })
  const folder = await driveFolderForCurrentUser()
  if (!folder) return NextResponse.json({ message: 'This account has no Drive folder.' }, { status: 404 })

  let fileId = ''
  try {
    const body: unknown = await request.json()
    if (body && typeof body === 'object' && 'fileId' in body && typeof body.fileId === 'string') fileId = body.fileId
  } catch {
    return NextResponse.json({ message: 'The press kit could not be prepared.' }, { status: 400 })
  }
  if (!isDriveFileId(fileId)) return NextResponse.json({ message: 'That file is not available.' }, { status: 404 })

  const item = await readVisibleLibraryItem(folder.id, fileId)
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
