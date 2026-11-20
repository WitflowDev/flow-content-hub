import { Suspense, type ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AppFrame } from '@/components/shell/AppFrame'
import { loadDriveLibrary } from '@/lib/drive/library'
import { ensureUserProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'
import { loadAccountNotices } from '@/lib/notifications/sync'
import type { SessionProfile } from '@/state/Session'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profile = await ensureUserProfile(user)
  const session: SessionProfile = {
    id: user.uid,
    name: profile?.name.trim() || '',
    email: user.email ?? profile?.email ?? '',
    companyName: profile?.companyName.trim() || '',
    role: profile?.role ?? 'client',
    onboardingDone: profile?.onboardingDone ?? false,
  }

  return (
    <Suspense fallback={<LibraryFallback profile={session} />}>
      <AccountLibrary
        userId={user.uid}
        email={user.email}
        folderId={profile?.driveFolderId ?? null}
        profile={session}
      >
        {children}
      </AccountLibrary>
    </Suspense>
  )
}

function LibraryFallback({ profile }: { profile: SessionProfile }) {
  return (
    <AppFrame profile={profile} notices={[]} media={[]} collections={[]}>
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
  profile,
  children,
}: {
  userId: string
  email: string | null
  folderId: string | null
  profile: SessionProfile
  children: ReactNode
}) {
  const [driveLibrary, notices] = await Promise.all([
    loadDriveLibrary(userId, email, folderId),
    loadAccountNotices(),
  ])

  return (
    <AppFrame
      profile={profile}
      notices={notices}
      media={driveLibrary.items}
      collections={driveLibrary.collections}
    >
      {children}
    </AppFrame>
  )
}
