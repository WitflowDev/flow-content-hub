import { Suspense, type ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AppFrame } from '@/components/shell/AppFrame'
import { LibraryRefresh } from '@/components/shell/LibraryRefresh'
import { loadDriveLibrary } from '@/lib/drive/library'
import { ensureUserProfile, type AccountProfile } from '@/lib/firebase/profile'
import { getFastSessionUser } from '@/lib/firebase/session'
import { loadAccountNotices } from '@/lib/notifications/sync'
import { readPreviewTarget } from '@/lib/preview'
import { resolvePalette, suggestedFlowLogo } from '@/lib/theme-palette'
import type { SessionProfile } from '@/state/Session'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getFastSessionUser()
  if (!user) redirect('/login')

  const [profile, previewTarget] = await Promise.all([ensureUserProfile(user), readPreviewTarget()])
  const viewed = previewTarget ?? profile
  const session = toSession(viewed, previewTarget !== null, previewTarget ? viewed.email : (user.email ?? profile.email))

  return (
    <Suspense fallback={<LibraryFallback profile={session} />}>
      <AccountLibrary
        userId={viewed.id}
        email={viewed.email}
        folderId={viewed.driveFolderId}
        favoriteFileIds={viewed.favoriteFileIds}
        includeDrafts={previewTarget !== null}
        profile={session}
      >
        {children}
      </AccountLibrary>
    </Suspense>
  )
}

function toSession(profile: AccountProfile, preview: boolean, email: string): SessionProfile {
  const palette = resolvePalette(profile.interfaceTheme, profile.themeColors)
  return {
    id: profile.id,
    name: profile.name.trim() || '',
    email,
    companyName: profile.companyName.trim() || '',
    role: profile.role,
    onboardingDone: profile.onboardingDone,
    interfaceTheme: profile.interfaceTheme,
    flowLogo: profile.flowLogo ?? suggestedFlowLogo(profile.interfaceTheme, palette.background),
    logoFileId: profile.logoFileId,
    bannerFileId: profile.bannerFileId,
    palette,
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
  favoriteFileIds,
  includeDrafts,
  profile,
  children,
}: {
  userId: string
  email: string | null
  folderId: string | null
  favoriteFileIds: string[]
  includeDrafts: boolean
  profile: SessionProfile
  children: ReactNode
}) {
  const [driveLibrary, notices] = await Promise.all([
    loadDriveLibrary(userId, email, folderId, includeDrafts),
    includeDrafts ? Promise.resolve([]) : loadAccountNotices(),
  ])

  return (
    <AppFrame
      profile={profile}
      notices={notices}
      media={driveLibrary.items}
      collections={driveLibrary.collections}
      favoriteFileIds={favoriteFileIds}
      preparing={driveLibrary.preparing}
    >
      <LibraryRefresh active={driveLibrary.preparing} />
      {driveLibrary.preparing ? <p className="collection-empty">Preparing your library…</p> : null}
      {children}
    </AppFrame>
  )
}
