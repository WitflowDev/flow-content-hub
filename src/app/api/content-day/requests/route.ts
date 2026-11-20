import { NextResponse } from 'next/server'
import { busyContentDayKeys, contentDayCalendarConfigured } from '@/lib/calendar/content-day'
import { canRequestContentDay, firstContentDay, isContentDayPlan, parseDateKey } from '@/lib/content-day'
import { saveContentDayRequest } from '@/lib/content-day-requests'
import { getSessionUser } from '@/lib/firebase/session'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(request: Request) {
  const user = await getSessionUser()
  if (!user) return NextResponse.json({ error: 'Sign in before requesting a Content Day.' }, { status: 401 })

  let body: unknown
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'The request could not be saved.' }, { status: 400 })
  }
  const parsed = readBody(body)
  if (!parsed) return NextResponse.json({ error: 'Add your name, a valid email, your company and a date.' }, { status: 400 })
  const date = parseDateKey(parsed.date)
  if (!date || !canRequestContentDay(date, firstContentDay().minDate)) {
    return NextResponse.json({ error: 'Choose an available date.' }, { status: 400 })
  }
  if (contentDayCalendarConfigured()) {
    try {
      const busy = await busyContentDayKeys(parsed.date, parsed.date)
      if (busy.includes(parsed.date)) return NextResponse.json({ error: 'That day is no longer available.' }, { status: 409 })
    } catch {
      return NextResponse.json({ error: 'Google Calendar availability could not be read.' }, { status: 503 })
    }
  }

  try {
    await saveContentDayRequest({ accountId: user.uid, ...parsed })
  } catch {
    return NextResponse.json({ error: 'The request could not be saved.' }, { status: 500 })
  }
  return NextResponse.json({ ok: true })
}

function readBody(value: unknown): { name: string; email: string; company: string; plan: 'monthly' | 'quarterly' | 'semiannual'; date: string } | null {
  if (!value || typeof value !== 'object') return null
  const body = value as Record<string, unknown>
  if (typeof body.name !== 'string' || typeof body.email !== 'string' || typeof body.company !== 'string') return null
  if (typeof body.plan !== 'string' || !isContentDayPlan(body.plan)) return null
  if (typeof body.date !== 'string' || !parseDateKey(body.date)) return null
  const name = body.name.trim()
  const email = body.email.trim()
  const company = body.company.trim()
  if (!name || name.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 180) return null
  if (!company || company.length > 160) return null
  return { name, email, company, plan: body.plan, date: body.date }
}
