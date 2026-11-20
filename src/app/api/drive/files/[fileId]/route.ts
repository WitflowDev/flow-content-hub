import { FieldValue } from 'firebase-admin/firestore'
import { downloadClientFile } from '@/lib/drive/client'
import { driveFolderForUser } from '@/lib/drive/resolve'
import { adminDb } from '@/lib/firebase/admin'
import { getSessionUser } from '@/lib/firebase/session'

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
      const saved = adminDb().collection('users').doc(user.uid).collection('drive_downloads').doc(fileId)
      const existing = await saved.get()
      if (!existing.exists) await saved.set({ createdAt: FieldValue.serverTimestamp() })
    } catch (error) {
      console.error(error instanceof Error ? error.message : 'The download could not be recorded.')
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
