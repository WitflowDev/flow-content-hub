export const CONTENT_DAY_DRAFT_KEY = 'flow-content-day-draft'

export type ContentDayPlanId = 'monthly' | 'quarterly' | 'semiannual'

export type ContentDayPlan = {
  name: string
  monthly: number
  months: number
  total: number
}

export const contentDayPlans: Record<ContentDayPlanId, ContentDayPlan> = {
  monthly: { name: 'Monthly', monthly: 890, months: 1, total: 890 },
  quarterly: { name: 'Quarterly', monthly: 850, months: 3, total: 2550 },
  semiannual: { name: 'Half year', monthly: 800, months: 6, total: 4800 },
}

export type ContentDayDraft = {
  plan: ContentDayPlanId
  date: string
  name: string
  email: string
  company: string
}

export type ContentDayRequestStatus = 'requested' | 'confirmed'

export type ContentDayRequest = {
  id: string
  accountId: string
  name: string
  email: string
  company: string
  plan: ContentDayPlanId
  date: string
  status: ContentDayRequestStatus
}

const fullDate = new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })

export function isContentDayPlan(value: string): value is ContentDayPlanId {
  switch (value) {
    case 'monthly':
    case 'quarterly':
    case 'semiannual':
      return true
    default:
      return false
  }
}

export function dateKey(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${date.getFullYear()}-${month}-${day}`
}

export function parseDateKey(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  if (Number.isNaN(date.getTime())) return null
  if (date.getFullYear() !== Number(match[1]) || date.getMonth() !== Number(match[2]) - 1) return null
  return date
}

export function formatContentDay(date: Date): string {
  const label = fullDate.format(date)
  return label.charAt(0).toUpperCase() + label.slice(1)
}

export function sameContentDay(a: Date | null, b: Date | null): boolean {
  if (!a || !b) return false
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function easter(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k + 7) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  return new Date(year, Math.floor((h + l - 7 * m + 114) / 31) - 1, ((h + l - 7 * m + 114) % 31) + 1)
}

export function isContentDayHoliday(date: Date): boolean {
  const key = `${date.getMonth() + 1}-${date.getDate()}`
  if (['1-1', '4-25', '5-1', '6-10', '8-15', '10-5', '11-1', '12-1', '12-8', '12-25'].includes(key)) return true
  const easterDate = easter(date.getFullYear())
  const friday = new Date(easterDate)
  friday.setDate(friday.getDate() - 2)
  const corpus = new Date(easterDate)
  corpus.setDate(corpus.getDate() + 60)
  return sameContentDay(date, friday) || sameContentDay(date, corpus)
}

export function canRequestContentDay(date: Date, minDate: Date, blocked?: ReadonlySet<string>): boolean {
  if (date < minDate || date.getDay() === 0 || date.getDay() === 6 || isContentDayHoliday(date)) return false
  return !blocked?.has(dateKey(date))
}

export function firstContentDay(): { minDate: Date; date: Date } {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const minDate = new Date(today)
  minDate.setDate(minDate.getDate() + 5)
  const cursor = new Date(today.getFullYear(), today.getMonth() + 1, 1)
  while (!canRequestContentDay(cursor, minDate)) cursor.setDate(cursor.getDate() + 1)
  return { minDate, date: cursor }
}

export function contentDayMessage(draft: ContentDayDraft): { subject: string; body: string } {
  const chosen = contentDayPlans[draft.plan]
  const date = parseDateKey(draft.date)
  const label = date ? formatContentDay(date) : draft.date
  const subject = `Flow Content Day availability request for ${label}`
  const body = [
    'Hello Flow team,',
    '',
    'I would like to request availability to start a monthly Content Day plan.',
    '',
    `My name is ${draft.name}.`,
    `My email is ${draft.email}.`,
    `My company is ${draft.company}.`,
    `The plan is ${chosen.name} at ${chosen.monthly} € per month plus VAT.`,
    `The commitment is ${chosen.months} ${chosen.months === 1 ? 'month' : 'months'}. The total is ${chosen.total} € plus VAT.`,
    `The preferred date for the first session is ${label}.`,
    'The hours are 09:00 to 18:00.',
    '',
    'I will wait for confirmation of the date and the commercial terms.',
    '',
    'Thank you.',
  ].join('\n')
  return { subject, body }
}

export function saveContentDayDraft(draft: ContentDayDraft): void {
  sessionStorage.setItem(CONTENT_DAY_DRAFT_KEY, JSON.stringify(draft))
}

export function readContentDayDraft(): ContentDayDraft | null {
  const raw = sessionStorage.getItem(CONTENT_DAY_DRAFT_KEY)
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!value || typeof value !== 'object') return null
    const draft = value as Record<string, unknown>
    if (typeof draft.plan !== 'string' || !isContentDayPlan(draft.plan)) return null
    if (typeof draft.date !== 'string' || !parseDateKey(draft.date)) return null
    if (typeof draft.name !== 'string' || typeof draft.email !== 'string' || typeof draft.company !== 'string') return null
    return {
      plan: draft.plan,
      date: draft.date,
      name: draft.name.trim(),
      email: draft.email.trim(),
      company: draft.company.trim(),
    }
  } catch {
    return null
  }
}
