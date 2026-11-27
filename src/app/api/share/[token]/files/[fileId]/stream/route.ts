import { openClientVideo } from '@/lib/drive/client'
import { contentDisposition, sharedFileAllowed, sharedFolderId } from '@/lib/share/media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ token: string; fileId: string }> }

export async function GET(request: Request, context: RouteContext) {
  const { token, fileId } = await context.params
  const folderId = await sharedFolderId(token)
  if (!folderId || !(await sharedFileAllowed(fileId))) return new Response('Not found', { status: 404 })
  try {
    const file = await openClientVideo(folderId, fileId, byteRange(request.headers.get('range')))
    const headers = new Headers({
      'Content-Type': file.mimeType,
      'Content-Disposition': contentDisposition(file.name, true),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, no-store',
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
