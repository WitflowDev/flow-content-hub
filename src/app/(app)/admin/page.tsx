import { redirect } from 'next/navigation'
import { AdminScreen } from '@/components/screens/AdminScreen'
import { ADMIN_EMAIL, isAdminUser } from '@/lib/auth'
import { loadClientCollections } from '@/lib/catalog'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (!isAdminUser(user)) redirect('/home')

  const [clients, assets, drafts, clientCollections] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('assets').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('collections').select('slug', { count: 'exact', head: true }).eq('published', false),
    loadClientCollections(),
  ])

  const accounts = await supabase
    .from('profiles')
    .select('id, email, name, company_name, role, drive_folder_id')
    .order('email')

  if (clients.error) throw new Error(clients.error.message)
  if (assets.error) throw new Error(assets.error.message)
  if (drafts.error) throw new Error(drafts.error.message)
  if (accounts.error) throw new Error(accounts.error.message)

  return (
    <AdminScreen
      clientCount={clients.count ?? 0}
      publishedAssets={assets.count ?? 0}
      draftCollections={drafts.count ?? 0}
      accounts={(accounts.data ?? []).map((account) => ({
        id: account.id,
        label: account.company_name?.trim() || account.name?.trim() || account.email || account.id,
      }))}
      clients={(accounts.data ?? [])
        .filter((account) => account.email?.trim().toLowerCase() !== ADMIN_EMAIL && account.role !== 'admin')
        .map((account) => ({
          id: account.id,
          label: account.company_name?.trim() || account.name?.trim() || account.email || 'Client',
          email: account.email ?? '',
          hasFolder: typeof account.drive_folder_id === 'string' && account.drive_folder_id.length > 0,
        }))}
      clientCollections={clientCollections}
    />
  )
}
