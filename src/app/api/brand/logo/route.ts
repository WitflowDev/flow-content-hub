import { readContainedImage } from '@/lib/drive/client'
import { requireAdmin } from '@/lib/auth/admin'
import { readUserProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'
import { readPreviewTarget } from '@/lib/preview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const USER_ID = /^[A-Za-z0-9]{10,128}$/

export async function GET(request: Request) {
  const session = await getSessionUser()
  if (!session) return new Response('Not found', { status: 404 })

  const requested = new URL(request.url).searchParams.get('user') ?? ''
  const preview = await readPreviewTarget()
  let userId = preview?.id ?? session.uid
  if (requested && requested !== session.uid) {
    if (!USER_ID.test(requested)) return new Response('Not found', { status: 404 })
    const admin = await requireAdmin()
    if (!admin) return new Response('Not found', { status: 404 })
    userId = requested
  }

  const profile = await readUserProfile(userId)
  if (!profile?.logoFileId || !profile.driveFolderId) return new Response('Not found', { status: 404 })
  const image = await readContainedImage(profile.driveFolderId, profile.logoFileId)
  if (!image) return new Response('Not found', { status: 404 })
  return new Response(Buffer.from(image.bytes), {
    headers: {
      'Content-Type': image.mimeType,
      'Cache-Control': 'private, max-age=86400',
    },
  })
}
