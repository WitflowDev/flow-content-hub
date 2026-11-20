import { NextResponse } from 'next/server'
import { adminAuth } from '@/lib/firebase/admin'
import { SESSION_COOKIE, sessionCookieOptions } from '@/lib/firebase/config'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN_MAX_AGE = 55 * 60

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
    await adminAuth().verifyIdToken(idToken)
  } catch (error) {
    console.error('Firebase session was rejected.', error instanceof Error ? error.message : error)
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, idToken, sessionCookieOptions(TOKEN_MAX_AGE))
  return response
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true })
  response.cookies.set(SESSION_COOKIE, '', sessionCookieOptions(0))
  return response
}
