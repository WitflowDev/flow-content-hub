import type { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { AppFrame } from '@/components/shell/AppFrame'
import { roleFromAppMetadata } from '@/lib/auth'
import { loadCatalog } from '@/lib/catalog'
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

  const catalog = await loadCatalog()

  return (
    <AppFrame
      profile={{
        id: user.id,
        name: profile?.name || 'there',
        email: user.email ?? '',
        role: roleFromAppMetadata(user.app_metadata),
        onboardingDone: profile?.onboarding_done ?? false,
      }}
      media={catalog.media}
      collections={catalog.collections}
    >
      {children}
    </AppFrame>
  )
}
