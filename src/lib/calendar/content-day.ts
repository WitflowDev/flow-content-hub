import 'server-only'
import { OAuth2Client } from 'google-auth-library'
import { dateKey, parseDateKey } from '@/lib/content-day'

const CALENDAR_SCOPE = 'https://www.googleapis.com/auth/calendar'
const TIME_ZONE = 'Europe/Lisbon'
const DAY_START = { hours: 9, minutes: 0 }
const DAY_END = { hours: 18, minutes: 0 }
const FREE_BUSY_CHUNK_DAYS = 84

type BusyInterval = { start: number; end: number }

type FreeBusyResponse = {
  calendars?: Record<string, { busy?: Array<{ start?: string; end?: string }>; errors?: unknown[] }>
}

let cachedClient: OAuth2Client | undefined

export function contentDayCalendarConfigured(): boolean {
  return Boolean(calendarId() && process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && calendarRefreshToken())
}

export async function busyContentDayKeys(fromKey: string, toKey: string): Promise<string[]> {
  const from = parseDateKey(fromKey)
  const to = parseDateKey(toKey)
  if (!from || !to || from > to) throw new Error('That date range is not available.')
  const span = Math.round((to.getTime() - from.getTime()) / 86_400_000)
  if (span > 400) throw new Error('That date range is not available.')
  const calendar = calendarId()
  if (!calendar) throw new Error('Google Calendar is not connected.')

  const token = await calendarAccessToken()
  const blocked: string[] = []
  const cursor = new Date(from)
  while (cursor <= to) {
    const chunkEnd = new Date(cursor)
    chunkEnd.setDate(chunkEnd.getDate() + FREE_BUSY_CHUNK_DAYS - 1)
    if (chunkEnd > to) chunkEnd.setTime(to.getTime())
    const intervals = await freeBusyIntervals(token, calendar, dateKey(cursor), dateKey(chunkEnd))
    const day = new Date(cursor)
    while (day <= chunkEnd) {
      const key = dateKey(day)
      const windowStart = lisbonInstant(key, DAY_START.hours, DAY_START.minutes)
      const windowEnd = lisbonInstant(key, DAY_END.hours, DAY_END.minutes)
      if (intervals.some((interval) => overlaps(windowStart, windowEnd, interval))) blocked.push(key)
      day.setDate(day.getDate() + 1)
    }
    cursor.setTime(chunkEnd.getTime())
    cursor.setDate(cursor.getDate() + 1)
  }
  return blocked
}

async function freeBusyIntervals(token: string, calendar: string, fromKey: string, toKey: string): Promise<BusyInterval[]> {
  const timeMin = new Date(lisbonInstant(fromKey, 0, 0))
  const timeMax = new Date(lisbonInstant(toKey, 23, 59) + 60_000)
  const response = await fetch('https://www.googleapis.com/calendar/v3/freeBusy', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      timeZone: TIME_ZONE,
      items: [{ id: calendar }],
    }),
  })
  if (!response.ok) throw new Error(await calendarError(response))
  const body = (await response.json()) as FreeBusyResponse
  const entry = body.calendars?.[calendar]
  if (!entry || (entry.errors?.length ?? 0) > 0) throw new Error('Google Calendar availability could not be read.')
  return (entry.busy ?? []).flatMap((interval) => {
    const start = Date.parse(interval.start ?? '')
    const end = Date.parse(interval.end ?? '')
    return Number.isFinite(start) && Number.isFinite(end) ? [{ start, end }] : []
  })
}

export async function createContentDayEvent(input: {
  date: string
  company: string
  name: string
  email: string
  plan: string
}): Promise<string> {
  const calendar = calendarId()
  if (!calendar) throw new Error('Google Calendar is not connected.')
  if (!parseDateKey(input.date)) throw new Error('Choose an available date.')
  const token = await calendarAccessToken()
  const response = await fetch(`https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calendar)}/events`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      summary: `Content Day · ${input.company}`,
      description: [
        `The client is ${input.name}.`,
        `The email is ${input.email}.`,
        `The plan is ${input.plan}.`,
        'The hours are 09:00 to 18:00.',
      ].join('\n'),
      start: { dateTime: `${input.date}T09:00:00`, timeZone: TIME_ZONE },
      end: { dateTime: `${input.date}T18:00:00`, timeZone: TIME_ZONE },
    }),
  })
  if (!response.ok) throw new Error(await calendarError(response))
  const created = (await response.json()) as { id?: string }
  if (!created.id) throw new Error('The Content Day could not be added to Google Calendar.')
  return created.id
}

function calendarId(): string {
  return process.env.GOOGLE_CALENDAR_ID?.trim() ?? ''
}

function calendarRefreshToken(): string {
  return process.env.GOOGLE_CALENDAR_REFRESH_TOKEN?.trim() || process.env.GOOGLE_OAUTH_REFRESH_TOKEN?.trim() || ''
}

function overlaps(start: number, end: number, interval: BusyInterval): boolean {
  return start < interval.end && interval.start < end
}

function lisbonInstant(dateKeyValue: string, hours: number, minutes: number): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKeyValue)
  if (!match) throw new Error('Choose an available date.')
  const year = Number(match[1])
  const month = Number(match[2])
  const day = Number(match[3])
  const wall = Date.UTC(year, month - 1, day, hours, minutes)
  const first = wall - lisbonOffset(wall)
  return wall - lisbonOffset(first)
}

function lisbonOffset(instant: number): number {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: TIME_ZONE,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instant))
  const value = (type: Intl.DateTimeFormatPartTypes) => Number(parts.find((part) => part.type === type)?.value)
  const zoned = Date.UTC(value('year'), value('month') - 1, value('day'), value('hour'), value('minute'), value('second'))
  return zoned - instant
}

async function calendarAccessToken(): Promise<string> {
  try {
    const access = await calendarClient().getAccessToken()
    if (!access.token) throw new Error('Google Calendar is not connected.')
    return access.token
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (/insufficient|scope|unauthorized|invalid_grant/i.test(message)) {
      throw new Error('Google Calendar needs a refresh token with calendar access.')
    }
    throw new Error('Google Calendar is not connected.')
  }
}

function calendarClient(): OAuth2Client {
  if (cachedClient) return cachedClient
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = calendarRefreshToken()
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Google Calendar is not connected.')
  const client = new OAuth2Client({ clientId, clientSecret })
  client.setCredentials({ refresh_token: refreshToken, scope: CALENDAR_SCOPE })
  cachedClient = client
  return client
}

async function calendarError(response: Response): Promise<string> {
  if (response.status === 403 || response.status === 401) return 'Google Calendar needs a refresh token with calendar access.'
  return 'Google Calendar could not be updated.'
}
