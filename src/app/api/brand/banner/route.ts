import { requireAdmin } from '@/lib/auth/admin'
import { wideClientImage } from '@/lib/drive/client'
import { readUserProfile } from '@/lib/firebase/profile'
import { getFastSessionUser } from '@/lib/firebase/session'
import { readPreviewTarget } from '@/lib/preview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const USER_ID = /^[A-Za-z0-9]{10,128}$/

export async function GET(request: Request) {
  const session = await getFastSessionUser()
  if (!session) return new Response('Not found', { status: 404 })

  const requested = new URL(request.url).searchParams.get('user') ?? ''
  const preview = await readPreviewTarget()
  let profile = preview
  if (requested && requested !== session.uid) {
    if (!USER_ID.test(requested)) return new Response('Not found', { status: 404 })
    const admin = await requireAdmin()
    if (!admin) return new Response('Not found', { status: 404 })
    profile = await readUserProfile(requested)
  } else if (!profile) {
    profile = await readUserProfile(session.uid)
  }

  if (!profile?.bannerFileId || !profile.driveFolderId) return new Response('Not found', { status: 404 })
  try {
    const image = await wideClientImage(profile.driveFolderId, profile.bannerFileId)
    return new Response(image.body, {
      headers: {
        'Content-Type': image.mimeType,
        'Cache-Control': 'private, max-age=86400',
      },
    })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}
