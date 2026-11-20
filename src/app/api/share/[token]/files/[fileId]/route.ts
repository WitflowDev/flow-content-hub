import { downloadClientFile } from '@/lib/drive/client'
import { contentDisposition, sharedFolderId } from '@/lib/share/media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ token: string; fileId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { token, fileId } = await context.params
  const folderId = await sharedFolderId(token)
  if (!folderId) return new Response('Not found', { status: 404 })
  try {
    const file = await downloadClientFile(folderId, fileId)
    return new Response(file.body, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': contentDisposition(file.name, false),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
