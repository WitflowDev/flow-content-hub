import { redirect } from 'next/navigation'
import { after } from 'next/server'
import { AdminScreen } from '@/components/screens/AdminScreen'
import { listDownloadEvents } from '@/lib/admin/downloads'
import { loadAdminOverview } from '@/lib/admin/overview'
import { parseRole } from '@/lib/auth'
import { listRequestedContentDays } from '@/lib/content-day-requests'
import { organizeClientFolders } from '@/lib/drive/owner'
import { readUserProfile } from '@/lib/firebase/profile'
import { readMetrics, reportError } from '@/lib/observe'
import { getSessionUser } from '@/lib/firebase/session'
import { readPreviewTarget } from '@/lib/preview'

export default async function AdminPage() {
  const user = await getSessionUser()
  if (!user) redirect('/login')
  if (await readPreviewTarget()) redirect('/home')

  const profile = await readUserProfile(user.uid)
  if (!profile || parseRole(profile.role) !== 'admin') redirect('/home')

  after(async () => {
    await organizeClientFolders().catch((error: unknown) => {
      reportError('drive.folders', error)
    })
  })

  const [overview, contentDays, downloads] = await Promise.all([
    loadAdminOverview(),
    listRequestedContentDays(),
    listDownloadEvents(),
  ])
  return <AdminScreen {...overview} contentDays={contentDays} downloads={downloads} metrics={readMetrics()} />
}
