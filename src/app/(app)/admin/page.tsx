import { redirect } from 'next/navigation'
import { AdminScreen } from '@/components/screens/AdminScreen'
import { loadAdminOverview } from '@/lib/admin/overview'
import { parseRole } from '@/lib/auth'
import { listRequestedContentDays } from '@/lib/content-day-requests'
import { organizeClientFolders } from '@/lib/drive/owner'
import { readUserProfile } from '@/lib/firebase/profile'
import { getSessionUser } from '@/lib/firebase/session'

export default async function AdminPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')

  const profile = await readUserProfile(user.uid)
  if (!profile || parseRole(profile.role) !== 'admin') redirect('/home')

  const [overview, contentDays] = await Promise.all([
    loadAdminOverview(),
    listRequestedContentDays(),
    organizeClientFolders().catch((error: unknown) => {
      console.error(error instanceof Error ? error.message : 'Client folders could not be moved into Clients.')
    }),
  ])
  return <AdminScreen {...overview} contentDays={contentDays} />
}
