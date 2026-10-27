import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AppFrame } from '@/components/shell/AppFrame'
import { roleFromAppMetadata } from '@/lib/auth'
import { loadCatalog } from '@/lib/catalog'
import { loadDriveLibrary } from '@/lib/drive/library'
import { loadAccountNotices, syncAccountNotices } from '@/lib/notifications/sync'
import { createClient } from '@/lib/supabase/server'

export default async function AppLayout({ children }: { children: ReactNode }) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('name, onboarding_done')
    .eq('id', user.id)
    .maybeSingle()
  if (error) throw new Error(error.message)

  const [catalog, driveLibrary] = await Promise.all([loadCatalog(), loadDriveLibrary(user.id, user.email)])
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
        id: user.id,
        name: profile?.name?.trim() || '',
        email: user.email ?? '',
        role: roleFromAppMetadata(user.app_metadata),
        onboardingDone: profile?.onboarding_done ?? false,
      }}
      notices={notices}
      media={[...driveLibrary.items, ...catalog.media]}
      collections={catalog.collections}
    >
      {children}
    </AppFrame>
  )
}
