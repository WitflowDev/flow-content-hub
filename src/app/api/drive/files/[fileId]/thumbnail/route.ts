import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { thumbnailClientFile } from '@/lib/drive/client'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ fileId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params
  const folder = await driveFolderForCurrentUser()
  if (!folder) return placeholder()

  try {
    const thumbnail = await thumbnailClientFile(folder.id, fileId)
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
  const bytes = readFileSync(join(process.cwd(), 'public', 'assets', 'flow-logo-black.png'))
  return new Response(bytes, {
    headers: {
      'Content-Type': 'image/png',
      'Cache-Control': 'private, no-store',
    },
  })
}
