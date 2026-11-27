import { after } from 'next/server'
import { recordDownload } from '@/lib/admin/downloads'
import { downloadClientFile } from '@/lib/drive/client'
import { libraryThumb } from '@/lib/drive/library'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'
import { getFastSessionUser } from '@/lib/firebase/session'
import { contentDisposition } from '@/lib/http/disposition'
import { reportError } from '@/lib/observe'
import { readPreviewTarget } from '@/lib/preview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ fileId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params
  const user = await getFastSessionUser()
  if (!user) return new Response('Not found', { status: 404 })
  const folder = await driveFolderForCurrentUser()
  if (!folder) return new Response('Not found', { status: 404 })

  const known = await libraryThumb(folder.id, fileId)
  if (known.status === 'hidden') return new Response('Not found', { status: 404 })

  try {
    const file = await downloadClientFile(folder.id, fileId)
    const preview = await readPreviewTarget()
    if (!preview) {
      const uid = user.uid
      const collectionId = file.collectionId
      const name = file.name
      after(async () => {
        await recordDownload({ uid, fileId, collectionId, name }).catch((error: unknown) =>
          reportError('downloads.record', error),
        )
      })
    }
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
