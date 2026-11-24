import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { SESSION_COOKIE, SESSION_MAX_AGE_SECONDS, sessionCookieOptions } from '@/lib/firebase/config'
import { reportError } from '@/lib/observe'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
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

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return response
}
