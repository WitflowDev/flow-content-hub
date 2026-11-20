import { wideClientImage } from '@/lib/drive/client'
import { sharedFolderId } from '@/lib/share/media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = { params: Promise<{ token: string; fileId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { token, fileId } = await context.params
  const folderId = await sharedFolderId(token)
  if (!folderId) return new Response('Not found', { status: 404 })
  try {
    const image = await wideClientImage(folderId, fileId)
    return new Response(image.body, {
      headers: {
        'Content-Type': image.mimeType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
