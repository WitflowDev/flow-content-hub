import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { thumbnailClientFile } from '@/lib/drive/client'
import { sharedFolderId } from '@/lib/share/media'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const placeholderBytes = readFileSync(join(process.cwd(), 'public', 'assets', 'flow-logo-black.png'))

type RouteContext = { params: Promise<{ token: string; fileId: string }> }

export async function GET(_request: Request, context: RouteContext) {
  const { token, fileId } = await context.params
  const folderId = await sharedFolderId(token)
  if (!folderId) return new Response('Not found', { status: 404 })
  try {
    const thumbnail = await thumbnailClientFile(folderId, fileId)
    if (!thumbnail) return placeholder()
    return new Response(thumbnail.body, {
      headers: {
        'Content-Type': thumbnail.mimeType,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return placeholder()
  }
}

function placeholder(): Response {
  return new Response(placeholderBytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
    },
  })
}
