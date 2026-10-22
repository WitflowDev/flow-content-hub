import { createBrowserClient } from '@supabase/ssr'
import type { SupabaseClient } from '@supabase/supabase-js'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'

let browserClient: SupabaseClient | undefined

export function createClient(): SupabaseClient {
  if (browserClient) return browserClient
  const { url, key } = readPublicSupabaseEnv()
  browserClient = createBrowserClient(url, key)
  return browserClient
}
