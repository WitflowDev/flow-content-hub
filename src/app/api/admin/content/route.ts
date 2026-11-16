import { roleFromAppMetadata } from '@/lib/auth'
import { publishMediaToFolders } from '@/lib/drive/owner'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

const CLIENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

type ProfileFolder = {
  id: string
  drive_folder_id: string | null
  company_name: string | null
  name: string | null
  email: string | null
}

export async function POST(request: Request) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || roleFromAppMetadata(user.app_metadata) !== 'admin') {
    return json({ ok: false, message: 'Only an admin can upload content.' }, 403)
  }

  let form: FormData
  try {
    form = await request.formData()
  } catch {
    return json({ ok: false, message: 'The upload could not be read.' }, 400)
  }

  const files = form.getAll('file').filter((entry): entry is File => entry instanceof File && entry.size > 0)
  const clientIds = [...new Set(form.getAll('clientId').map(String).filter((id) => CLIENT_ID.test(id)))]
  if (files.length === 0) return json({ ok: false, message: 'Choose a photo or video.' }, 400)
  if (clientIds.length === 0) return json({ ok: false, message: 'Choose at least one client.' }, 400)

  const profiles = await supabase
    .from('profiles')
    .select('id, drive_folder_id, company_name, name, email')
    .in('id', clientIds)
  if (profiles.error) return json({ ok: false, message: 'The clients could not be loaded.' }, 500)

  const ready = ((profiles.data ?? []) as ProfileFolder[]).filter(
    (profile) => typeof profile.drive_folder_id === 'string' && profile.drive_folder_id,
  )
  if (ready.length !== clientIds.length) {
    return json({ ok: false, message: 'Choose clients that already have a content folder.' }, 400)
  }

  let published = 0
  try {
    for (const file of files) {
      const name = safeFileName(file.name)
      const mimeType = file.type
      if (!name || (!mimeType.startsWith('image/') && !mimeType.startsWith('video/'))) {
        return json({ ok: false, message: 'Upload photos or videos only.' }, 400)
      }
      await publishMediaToFolders(
        ready.map((profile) => profile.drive_folder_id as string),
        { name, mimeType, bytes: new Uint8Array(await file.arrayBuffer()) },
      )
      published += 1
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : 'The file could not be saved.'
    if (published === 0) return json({ ok: false, message }, 502)
    return json({ ok: false, message: `Saved ${published} of ${files.length} files. ${message}` }, 502)
  }

  const clientCount = ready.length
  return json(
    {
      ok: true,
      message: `${published === 1 ? '1 file' : `${published} files`} added for ${clientCount === 1 ? '1 client' : `${clientCount} clients`}.`,
    },
    200,
  )
}

function safeFileName(name: string): string | null {
  const base = name.split(/[/\\]/).pop()?.replace(/[\u0000-\u001F\u007F]/g, '').trim() ?? ''
  if (!base || base === '.' || base === '..' || base.length > 180) return null
  return base
}

function json(body: { ok: boolean; message: string }, status: number) {
  return Response.json(body, { status })
}
