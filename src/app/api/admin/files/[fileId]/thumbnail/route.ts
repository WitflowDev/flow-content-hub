import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { isDriveFileId, readFolderName, thumbnailClientFile } from '@/lib/drive/client'
import { requireAdmin } from '@/lib/auth/admin'
import { adminDb } from '@/lib/firebase/admin'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const placeholderBytes = readFileSync(join(process.cwd(), 'public', 'assets', 'flow-logo-black.png'))

type RouteContext = {
  params: Promise<{ fileId: string }>
}

export async function GET(request: Request, context: RouteContext) {
  const admin = await requireAdmin()
  if (!admin) return new Response('Not found', { status: 404 })

  const { fileId } = await context.params
  const folderId = new URL(request.url).searchParams.get('folder') ?? ''
  if (!isDriveFileId(fileId) || !isDriveFileId(folderId)) return placeholder()

  const owner = await adminDb().collection('users').where('driveFolderId', '==', folderId).limit(1).get()
  if (owner.empty) return placeholder()

  try {
    await readFolderName(folderId)
    const thumbnail = await thumbnailClientFile(folderId, fileId, false)
    if (!thumbnail) return placeholder()
    return new Response(thumbnail.body, {
      headers: {
        'Content-Type': thumbnail.mimeType,
        'Cache-Control': 'private, max-age=3600',
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
