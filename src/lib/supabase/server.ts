import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'

export async function createClient() {
  const cookieStore = await cookies()
  const { url, key } = readPublicSupabaseEnv()

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => {
            cookieStore.set(name, value, options)
          })
        } catch {
          // A Server Component cannot always write cookies. The proxy refreshes the session.
        }
      },
    },
  })
}
