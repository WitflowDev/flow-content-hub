import { downloadClientFile } from '@/lib/drive/client'
import { driveFolderForUser } from '@/lib/drive/resolve'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ fileId: string }>
}

export async function GET(_request: Request, context: RouteContext) {
  const { fileId } = await context.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Not found', { status: 404 })
  const folder = await driveFolderForUser(user.id, user.email)
  if (!folder) return new Response('Not found', { status: 404 })

  try {
    const file = await downloadClientFile(folder.id, fileId)
    const saved = await supabase.from('drive_downloads').upsert(
      { profile_id: user.id, drive_file_id: fileId },
      { onConflict: 'profile_id,drive_file_id', ignoreDuplicates: true },
    )
    if (saved.error) console.error(saved.error.message)
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
