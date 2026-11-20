import { NextResponse, type NextRequest } from 'next/server'
import { parseRole } from '@/lib/auth'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { SESSION_COOKIE } from '@/lib/firebase/config'

export async function proxy(request: NextRequest) {
  // Server actions POST to the current page. A redirect here is not a valid action response.
  if (request.headers.has('next-action')) return NextResponse.next()

  const path = request.nextUrl.pathname
  const user = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value)
  const isPublic =
    path === '/' ||
    path === '/login' ||
    path === '/reset-password' ||
    path === '/api/auth/session' ||
    path.startsWith('/share/') ||
    path.startsWith('/api/share/')
  if (!user && !isPublic) return redirectTo(request, '/login')

  if (user && (path === '/login' || path.startsWith('/admin'))) {
    const profile = await adminDb().collection('users').doc(user.uid).get()
    if (path === '/login') {
      const nextPath = profile.get('onboardingDone') === true ? '/home' : '/onboarding'
      return redirectTo(request, nextPath)
    }
    if (parseRole(profile.get('role')) !== 'admin') return redirectTo(request, '/home')
  }

  return NextResponse.next()
}

async function sessionUser(token: string | undefined): Promise<{ uid: string } | null> {
  if (!token) return null
  try {
    const decoded = await adminAuth().verifyIdToken(token)
    return { uid: decoded.uid }
  } catch {
    return null
  }
}

function redirectTo(request: NextRequest, pathname: string) {
  const url = request.nextUrl.clone()
  url.pathname = pathname
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|assets/|downloads/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|zip|ico)$).*)',
  ],
}
