import { NextResponse } from 'next/server'
import { busyContentDayKeys, contentDayCalendarConfigured } from '@/lib/calendar/content-day'
import { parseDateKey } from '@/lib/content-day'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CACHE_TTL_MS = 2 * 60 * 1000
const MAX_CACHE_ENTRIES = 64
const MAX_SPAN_DAYS = 370

const availabilityCache = new Map<string, { busy: string[]; expiresAt: number }>()
const availabilityInflight = new Map<string, Promise<string[]>>()

export async function GET(request: Request) {
  const url = new URL(request.url)
  const from = url.searchParams.get('from') ?? ''
  const to = url.searchParams.get('to') ?? ''
  const start = parseDateKey(from)
  const end = parseDateKey(to)
  if (!start || !end || end < start) {
    return NextResponse.json({ error: 'That date range is not available.' }, { status: 400 })
  }
  const spanDays = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000))
  if (spanDays > MAX_SPAN_DAYS) {
    return NextResponse.json({ error: 'That date range is too wide.' }, { status: 400 })
  }
  if (!contentDayCalendarConfigured()) {
    return NextResponse.json({ configured: false, busy: [] })
  }

  const key = `${from}:${to}`
  const cached = availabilityCache.get(key)
  if (cached && cached.expiresAt > Date.now()) {
    return NextResponse.json(
      { configured: true, busy: cached.busy },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' } },
    )
  }

  try {
    let pending = availabilityInflight.get(key)
    if (!pending) {
      pending = busyContentDayKeys(from, to).finally(() => {
        availabilityInflight.delete(key)
      })
      availabilityInflight.set(key, pending)
    }
    const busy = await pending
    if (availabilityCache.size >= MAX_CACHE_ENTRIES) {
      const oldest = availabilityCache.keys().next().value
      if (oldest !== undefined) availabilityCache.delete(oldest)
    }
    availabilityCache.set(key, { busy, expiresAt: Date.now() + CACHE_TTL_MS })
    return NextResponse.json(
      { configured: true, busy },
      { headers: { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=120' } },
    )
  } catch (error) {
    console.error(error instanceof Error ? error.message : 'Google Calendar availability could not be read.')
    return NextResponse.json({ error: 'Google Calendar availability could not be read.' }, { status: 503 })
  }
}
