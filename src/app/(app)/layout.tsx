import { Suspense, type ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AppFrame } from '@/components/shell/AppFrame'
import { loadDriveLibrary } from '@/lib/drive/library'
import { readFavoriteFileIds } from '@/lib/favorites/store'
import { ensureUserProfile, type AccountProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'
import { loadAccountNotices } from '@/lib/notifications/sync'
import { readPreviewTarget } from '@/lib/preview'
import { resolvePalette } from '@/lib/theme-palette'
import type { SessionProfile } from '@/state/Session'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profile = await ensureUserProfile(user)
  const previewTarget = await readPreviewTarget()
  const viewed = previewTarget ?? profile
  const session = toSession(viewed, previewTarget !== null, previewTarget ? viewed.email : (user.email ?? profile.email))

  return (
    <Suspense fallback={<LibraryFallback profile={session} />}>
      <AccountLibrary
        userId={viewed.id}
        email={viewed.email}
        folderId={viewed.driveFolderId}
        includeDrafts={previewTarget !== null}
        profile={session}
      >
        {children}
      </AccountLibrary>
    </Suspense>
  )
}

function toSession(profile: AccountProfile, preview: boolean, email: string): SessionProfile {
  return {
    id: profile.id,
    name: profile.name.trim() || '',
    email,
    companyName: profile.companyName.trim() || '',
    role: profile.role,
    onboardingDone: profile.onboardingDone,
    interfaceTheme: profile.interfaceTheme,
    logoFileId: profile.logoFileId,
    bannerFileId: profile.bannerFileId,
    palette: resolvePalette(profile.interfaceTheme, profile.themeColors),
    preview,
  }
}

function LibraryFallback({ profile }: { profile: SessionProfile }) {
  return (
    <AppFrame profile={profile} notices={[]} media={[]} collections={[]} favoriteFileIds={[]}>
      <div className="page">
        <p className="collection-empty">Loading your library…</p>
      </div>
    </AppFrame>
  )
}

async function AccountLibrary({
  userId,
  email,
  folderId,
  includeDrafts,
  profile,
  children,
}: {
  userId: string
  email: string | null
  folderId: string | null
  includeDrafts: boolean
  profile: SessionProfile
  children: ReactNode
}) {
  const [driveLibrary, notices, favoriteFileIds] = await Promise.all([
    loadDriveLibrary(userId, email, folderId, includeDrafts),
    includeDrafts ? Promise.resolve([]) : loadAccountNotices(),
    readFavoriteFileIds(userId),
  ])

  return (
    <AppFrame
      profile={profile}
      notices={notices}
      media={driveLibrary.items}
      collections={driveLibrary.collections}
      favoriteFileIds={favoriteFileIds}
    >
      {children}
    </AppFrame>
  )
}
