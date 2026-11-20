import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AppFrame } from '@/components/shell/AppFrame'
import { loadDriveLibrary } from '@/lib/drive/library'
import { ensureUserProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'
import { loadAccountNotices, syncAccountNotices } from '@/lib/notifications/sync'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profile = await ensureUserProfile(user)
  const driveLibrary = await loadDriveLibrary(user.uid, user.email, profile?.driveFolderId ?? null)
  const driveFileIds = driveLibrary.items.flatMap((item) => (item.driveFileId ? [item.driveFileId] : []))
  await syncAccountNotices({
    fileIds: driveFileIds,
    folderName: driveLibrary.folderName,
    hasFolder: driveLibrary.hasFolder,
  })
  const notices = await loadAccountNotices()

  return (
    <AppFrame
      profile={{
        id: user.uid,
        name: profile?.name.trim() || '',
        email: user.email ?? profile?.email ?? '',
        role: profile?.role ?? 'client',
        onboardingDone: profile?.onboardingDone ?? false,
      }}
      notices={notices}
      media={driveLibrary.items}
      collections={driveLibrary.collections}
    >
      {children}
    </AppFrame>
  )
}
