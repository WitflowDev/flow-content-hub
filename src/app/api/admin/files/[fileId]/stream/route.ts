import { requireAdmin } from '@/lib/auth/admin'
import { isDriveFileId, openClientVideo, readFolderName } from '@/lib/drive/client'
import { adminDb } from '@/lib/firebase/admin'
import { contentDisposition } from '@/lib/http/disposition'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ fileId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const admin = await requireAdmin()
  if (!admin) return new Response('Not found', { status: 404 })

  const { fileId } = await context.params
  const folderId = new URL(request.url).searchParams.get('folder') ?? ''
  if (!isDriveFileId(fileId) || !isDriveFileId(folderId)) return new Response('Not found', { status: 404 })

  const owner = await adminDb().collection('users').where('driveFolderId', '==', folderId).limit(1).get()
  if (owner.empty) return new Response('Not found', { status: 404 })

  try {
    await readFolderName(folderId)
    const file = await openClientVideo(folderId, fileId, byteRange(request.headers.get('range')))
    const headers = new Headers({
      'Content-Type': file.mimeType,
      'Content-Disposition': contentDisposition(file.name, true),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private',
    })
    if (file.contentLength) headers.set('Content-Length', file.contentLength)
    if (file.contentRange) headers.set('Content-Range', file.contentRange)
    return new Response(file.body, { status: file.status, headers })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

function byteRange(header: string | null): string | null {
  if (!header) return null
  const value = header.trim()
  if (!/^bytes=(?:\d+-\d*|-\d+)$/i.test(value)) return null
  return value
}
