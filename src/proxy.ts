import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { roleFromAppMetadata } from '@/lib/auth'
import { readPublicSupabaseEnv } from '@/lib/supabase/env'

type PendingCookie = {
  name: string
  value: string
  options: Parameters<NextResponse['cookies']['set']>[2]
}

export async function proxy(request: NextRequest) {
  const { url, key } = readPublicSupabaseEnv()
  let supabaseResponse = NextResponse.next({ request })
  let pendingCookies: PendingCookie[] = []

  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        pendingCookies = cookiesToSet
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
        supabaseResponse = NextResponse.next({ request })
        cookiesToSet.forEach(({ name, value, options }) => {
          supabaseResponse.cookies.set(name, value, options)
        })
        Object.entries(headers).forEach(([header, value]) => {
          supabaseResponse.headers.set(header, value)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()
  const path = request.nextUrl.pathname

  const isPublic = path === '/login' || path === '/reset-password'
  if (!user && !isPublic) {
    return withSession(supabaseResponse, pendingCookies, redirectTo(request, '/login'))
  }

  if (user && path === '/login') {
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_done')
      .eq('id', user.id)
      .maybeSingle()
    const nextPath = profile?.onboarding_done ? '/home' : '/onboarding'
    return withSession(supabaseResponse, pendingCookies, redirectTo(request, nextPath))
  }

  if (user && path.startsWith('/admin') && roleFromAppMetadata(user.app_metadata) !== 'admin') {
    return withSession(supabaseResponse, pendingCookies, redirectTo(request, '/home'))
  }

  return supabaseResponse
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url)
}

function withSession(source: NextResponse, cookies: PendingCookie[], response: NextResponse) {
  cookies.forEach(({ name, value, options }) => {
    response.cookies.set(name, value, options)
  })
  for (const header of ['cache-control', 'expires', 'pragma']) {
    const value = source.headers.get(header)
    if (value) response.headers.set(header, value)
  }
  return response
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|downloads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|zip|ico)$).*)',
  ],
}
