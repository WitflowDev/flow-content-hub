import { requireAdmin } from '@/lib/auth/admin'
import { isDriveFileId, readFolderName, wideClientImage } from '@/lib/drive/client'
import { adminDb } from '@/lib/firebase/admin'

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
    const image = await wideClientImage(folderId, fileId)
    return new Response(image.body, {
      headers: {
        'Content-Type': image.mimeType,
        'Content-Disposition': 'inline',
        'Cache-Control': 'private, max-age=3600',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
