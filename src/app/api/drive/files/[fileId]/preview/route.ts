import { wideClientImage } from '@/lib/drive/client'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ fileId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params
  const folder = await driveFolderForCurrentUser()
  if (!folder) return new Response('Not found', { status: 404 })

  try {
    const image = await wideClientImage(folder.id, fileId)
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
