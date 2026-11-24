import { recordDownload } from '@/lib/admin/downloads'
import { downloadClientFile } from '@/lib/drive/client'
import { driveFolderForUser } from '@/lib/drive/resolve'
import { getSessionUser } from '@/lib/firebase/session'
import { reportError } from '@/lib/observe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ fileId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params
  const user = await getSessionUser()
  if (!user) return new Response('Not found', { status: 404 })
  const folder = await driveFolderForUser(user.uid, user.email)
  if (!folder) return new Response('Not found', { status: 404 })

  try {
    const file = await downloadClientFile(folder.id, fileId)
    try {
      await recordDownload({
        uid: user.uid,
        fileId,
        collectionId: file.collectionId,
        name: file.name,
      })
    } catch (error) {
      reportError('downloads.record', error)
    }
    return new Response(file.body, {
      headers: {
        'Content-Type': file.mimeType,
        'Content-Disposition': contentDisposition(file.name),
        'Cache-Control': 'private, no-store',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

function contentDisposition(filename: string): string {
  const cleaned = filename.replace(/[\r\n"]/g, '')
  return `attachment; filename="${cleaned}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`
}
