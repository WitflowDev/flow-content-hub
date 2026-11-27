import { NextResponse, type NextRequest } from 'next/server'
import { parseRole } from '@/lib/auth'
import { adminAuth, adminDb } from '@/lib/firebase/admin'
import { FLOW_EMAIL_HEADER, FLOW_UID_HEADER, SESSION_COOKIE } from '@/lib/firebase/config'
import { recordMetric, reportError } from '@/lib/observe'

type SessionStamp = {
  uid: string
  email: string | null
}

export async function proxy(request: NextRequest) {
  // Server actions verify the cookie themselves. Strip any client-supplied stamp first.
  if (request.headers.has('next-action')) return continueWithUser(request, null)

  const path = request.nextUrl.pathname
  // High-frequency media routes authenticate directly via getFastSessionUser() (local JWT check).
  if (path.startsWith('/api/drive/files/') || path.startsWith('/api/brand/')) {
    return continueWithUser(request, null)
  }
  const user = await sessionUser(request.cookies.get(SESSION_COOKIE)?.value)
  const isPublic =
    path === '/' ||
    path === '/login' ||
    path === '/reset-password' ||
    path === '/api/auth/session' ||
    path.startsWith('/share/') ||
    path.startsWith('/api/share/') ||
    path === '/api/content-day/availability'

  if (!user && !isPublic) {
    if (path.startsWith('/api/')) {
      return NextResponse.json({ ok: false, error: 'Unauthorized', message: 'Please sign in again.' }, { status: 401 })
    }
    return redirectTo(request, '/login')
  }

  if (user && (path === '/login' || path === '/onboarding')) return redirectTo(request, '/home')

  if (user && (path.startsWith('/admin') || path.startsWith('/api/admin/'))) {
    const profile = await adminDb().collection('users').doc(user.uid).get()
    if (parseRole(profile.get('role')) !== 'admin') {
      if (path.startsWith('/api/')) {
        return NextResponse.json({ ok: false, error: 'Forbidden', message: 'Only an admin can do that.' }, { status: 403 })
      }
      return redirectTo(request, '/home')
    }
  }

  return continueWithUser(request, user)
}

async function sessionUser(token: string | undefined): Promise<SessionStamp | null> {
  if (!token) return null
  try {
    const decoded = await adminAuth().verifySessionCookie(token, false)
    return { uid: decoded.uid, email: decoded.email ?? null }
  } catch (error) {
    recordMetric('auth.rejected')
    reportError('auth.session', error)
    return null
  }
}

function continueWithUser(request: NextRequest, user: SessionStamp | null) {
  const headers = new Headers(request.headers)
  headers.delete(FLOW_UID_HEADER)
  headers.delete(FLOW_EMAIL_HEADER)
  if (user) {
    headers.set(FLOW_UID_HEADER, user.uid)
    if (user.email) headers.set(FLOW_EMAIL_HEADER, user.email)
  }
  return NextResponse.next({ request: { headers } })
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
