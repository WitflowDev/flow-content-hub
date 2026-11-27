import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, sessionCookieOptions } from '@/lib/firebase/config'
import { getSessionUser } from '@/lib/firebase/session'
import { reportError } from '@/lib/observe'
import { PREVIEW_COOKIE } from '@/lib/preview'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    const urlOrigin = new URL(request.url).origin
    if (origin === urlOrigin) return true
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
    return Boolean(forwardedHost && origin === `${forwardedProto}://${forwardedHost}`)
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase()
  if (!contentType.includes('application/json')) {
    return NextResponse.json({ ok: false }, { status: 415 })
  }

  let idToken = ''
  try {
    const body: unknown = await request.json()
    if (body && typeof body === 'object' && 'idToken' in body && typeof body.idToken === 'string') {
      idToken = body.idToken
    }
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 })
  }
  if (!idToken) return NextResponse.json({ ok: false }, { status: 400 })

  try {
    const session = await adminAuth().createSessionCookie(idToken, { expiresIn: SESSION_MAX_AGE_SECONDS * 1000 })
    const response = NextResponse.json({ ok: true })
    response.cookies.set(SESSION_COOKIE, session, sessionCookieOptions(SESSION_MAX_AGE_SECONDS))
    return response
  } catch (error) {
    reportError('auth.session', error)
    return NextResponse.json({ ok: false }, { status: 401 })
  }
}

export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ ok: false }, { status: 403 })
  }
  const current = await getSessionUser()
  if (current) {
    await adminAuth()
      .revokeRefreshTokens(current.uid)
      .catch((error: unknown) => reportError('auth.revoke', error))
  }
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  response.cookies.set(PREVIEW_COOKIE, '', sessionCookieOptions(0))
  return response
}
