import { NextResponse } from 'next/server'
import { busyContentDayKeys, contentDayCalendarConfigured } from '@/lib/calendar/content-day'
import { parseDateKey } from '@/lib/content-day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get('from') ?? ''
  const to = url.searchParams.get('to') ?? ''
  if (!parseDateKey(from) || !parseDateKey(to)) {
    return NextResponse.json({ error: 'That date range is not available.' }, { status: 400 })
  }
  if (!contentDayCalendarConfigured()) {
    return NextResponse.json({ configured: false, busy: [] })
  }
  try {
    const busy = await busyContentDayKeys(from, to)
    return NextResponse.json({ configured: true, busy })
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Google Calendar availability could not be read.')
    return NextResponse.json({ error: 'Google Calendar availability could not be read.' }, { status: 503 })
  }
}
