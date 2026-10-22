import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function IndexPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarding_done')
    .eq('id', user.id)
    .maybeSingle()

  redirect(profile?.onboarding_done ? '/home' : '/onboarding')
}
