import { redirect } from 'next/navigation'
import { AdminScreen } from '@/components/screens/AdminScreen'
import { roleFromAppMetadata } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  if (roleFromAppMetadata(user.app_metadata) !== 'admin') redirect('/home')

  const [clients, assets, drafts] = await Promise.all([
    supabase.from('profiles').select('id', { count: 'exact', head: true }).eq('role', 'client'),
    supabase.from('assets').select('id', { count: 'exact', head: true }).eq('published', true),
    supabase.from('collections').select('slug', { count: 'exact', head: true }).eq('published', false),
  ])

  const accounts = await supabase.from('profiles').select('id, email, name, company_name').order('email')

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
    />
  )
}
