import { openClientVideo } from '@/lib/drive/client'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ fileId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const { fileId } = await context.params
  const folder = await driveFolderForCurrentUser()
  if (!folder) return new Response('Not found', { status: 404 })

  try {
    const file = await openClientVideo(folder.id, fileId, byteRange(request.headers.get('range')))
    const headers = new Headers({
      'Content-Type': file.mimeType,
      'Content-Disposition': inlineDisposition(file.name),
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
  if (!/^bytes=\d*-\d*$/i.test(value)) return null
  return value
}

function inlineDisposition(filename: string): string {
  const cleaned = filename.replace(/[\r\n"]/g, '')
  return `inline; filename="${cleaned}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`
}
