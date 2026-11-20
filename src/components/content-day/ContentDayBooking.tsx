'use client'

import { useEffect, useMemo, useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import {
  canRequestContentDay,
  contentDayPlans,
  dateKey,
  firstContentDay,
  formatContentDay,
  isContentDayPlan,
  parseDateKey,
  readContentDayDraft,
  sameContentDay,
  saveContentDayDraft,
  type ContentDayDraft,
  type ContentDayPlanId,
} from '@/lib/content-day'

const opening = firstContentDay()
const monthFormat = new Intl.DateTimeFormat('en-GB', { month: 'long', year: 'numeric' })

function nextOpenDay(busy: ReadonlySet<string>): Date {
  const cursor = new Date(opening.minDate)
  for (let index = 0; index < 370; index += 1) {
    if (canRequestContentDay(cursor, opening.minDate, busy)) return new Date(cursor)
    cursor.setDate(cursor.getDate() + 1)
  }
  return opening.date
}

function isAvailability(value: unknown): value is { configured: boolean; busy: string[] } {
  if (!value || typeof value !== 'object') return false
  const body = value as Record<string, unknown>
  return typeof body.configured === 'boolean' && Array.isArray(body.busy) && body.busy.every((item) => typeof item === 'string')
}

function messageFrom(value: unknown): string {
  if (!value || typeof value !== 'object' || !('error' in value)) return 'The request could not be saved.'
  const error = (value as { error?: unknown }).error
  return typeof error === 'string' && error ? error : 'The request could not be saved.'
}

function cap(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

function Arrow() {
  return (
    <svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  )
}

export function ContentDayBooking({
  mode,
  plan: planProp,
  onPlanChange,
}: {
  mode: 'ask' | 'send'
  plan?: ContentDayPlanId
  onPlanChange?: (plan: ContentDayPlanId) => void
}) {
  const router = useRouter()
  const [saved, setSaved] = useState<ContentDayDraft | null>(null)
  const [localPlan, setLocalPlan] = useState<ContentDayPlanId>('quarterly')
  const plan = mode === 'ask' ? (planProp ?? 'quarterly') : localPlan
  const [month, setMonth] = useState(() => new Date(opening.date.getFullYear(), opening.date.getMonth(), 1))
  const [selected, setSelected] = useState<Date>(opening.date)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')

  useEffect(() => {
    if (mode !== 'send') return
    const draft = readContentDayDraft()
    if (!draft) return
    const date = parseDateKey(draft.date)
    setSaved(draft)
    setLocalPlan(draft.plan)
    setName(draft.name)
    setEmail(draft.email)
    setCompany(draft.company)
    if (!date) return
    setSelected(date)
    setMonth(new Date(date.getFullYear(), date.getMonth(), 1))
  }, [mode])

  useEffect(() => {
    const end = new Date()
    end.setMonth(end.getMonth() + 12)
    const from = dateKey(opening.minDate)
    const to = dateKey(end)
    let active = true
    void fetch(`/api/content-day/availability?from=${from}&to=${to}`)
      .then(async (response) => {
        const body: unknown = await response.json().catch(() => null)
        if (!active) return
        if (!response.ok || !isAvailability(body)) {
          setCalendarError(true)
          return
        }
        if (!body.configured) return
        const next = new Set(body.busy)
        setBlocked(next)
        setSelected((current) => (canRequestContentDay(current, opening.minDate, next) ? current : nextOpenDay(next)))
      })
      .catch(() => {
        if (active) setCalendarError(true)
      })
    return () => {
      active = false
    }
  }, [])

  const [invalid, setInvalid] = useState<'name' | 'email' | 'company' | null>(null)
  const [blocked, setBlocked] = useState<ReadonlySet<string>>(new Set())
  const [calendarError, setCalendarError] = useState(false)
  const [message, setMessage] = useState(
    mode === 'ask'
      ? 'We ask you to create an account before this request is finished. Nothing is charged.'
      : 'The date is added to the Flow calendar only after we confirm it.',
  )
  const [messageError, setMessageError] = useState(false)
  const [ready, setReady] = useState<ContentDayDraft | null>(null)
  const minDate = opening.minDate
  const firstMonth = useMemo(() => new Date(opening.date.getFullYear(), opening.date.getMonth(), 1), [])
  const lastMonth = useMemo(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth() + 12, 1)
  }, [])
  const cells = useMemo(() => {
    const year = month.getFullYear()
    const monthIndex = month.getMonth()
    const lead = (new Date(year, monthIndex, 1).getDay() + 6) % 7
    const days = new Date(year, monthIndex + 1, 0).getDate()
    const items: Array<Date | null> = []
    for (let index = 0; index < lead; index += 1) items.push(null)
    for (let day = 1; day <= days; day += 1) items.push(new Date(year, monthIndex, day))
    return items
  }, [month])

  function setPlan(next: ContentDayPlanId) {
    if (mode === 'ask') onPlanChange?.(next)
    else setLocalPlan(next)
  }

  function shiftMonth(diff: number) {
    const next = new Date(month.getFullYear(), month.getMonth() + diff, 1)
    if (next < firstMonth || next > lastMonth) return
    setMonth(next)
  }

  function collect(): ContentDayDraft | null {
    const cleanName = name.trim()
    const cleanEmail = email.trim()
    const cleanCompany = company.trim()
    const emailOk = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)
    const bad = !cleanName ? 'name' : !emailOk ? 'email' : !cleanCompany ? 'company' : null
    if (!selected || bad) {
      setInvalid(bad)
      setMessageError(true)
      setMessage(selected ? 'Add your name, a valid email and your company.' : 'Choose a date on the calendar.')
      return null
    }
    setInvalid(null)
    setMessageError(false)
    return { plan, date: dateKey(selected), name: cleanName, email: cleanEmail, company: cleanCompany }
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const next = collect()
    if (!next || !selected) return
    if (calendarError || !canRequestContentDay(selected, minDate, blocked)) {
      setMessageError(true)
      setMessage(calendarError ? 'The calendar could not be checked. Try again in a moment.' : 'Choose an available date.')
      return
    }
    if (mode === 'ask') {
      setReady(next)
      setMessage('Check the details, then create an account or sign in to finish.')
      return
    }
    setMessage('Saving the request.')
    const response = await fetch('/api/content-day/requests', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(next),
    })
    const body: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      setMessageError(true)
      setMessage(messageFrom(body))
      return
    }
    saveContentDayDraft(next)
    setMessageError(false)
    setMessage('Request saved. It is added to the Flow calendar only after we confirm it.')
  }

  function continueToAccount(signup: boolean) {
    if (!ready) return
    saveContentDayDraft(ready)
    router.push(signup ? '/login?mode=signup' : '/login')
  }

  const chosen = contentDayPlans[plan]

  function dayIsOpen(date: Date): boolean {
    return !calendarError && canRequestContentDay(date, minDate, blocked)
  }

  return (
    <>
    <div className="booking-grid" id={mode === 'ask' ? 'agenda' : undefined}>
      <div className="calendar-card">
        <div className="calendar-top">
          <div>
            <span className="eyebrow">PREFERRED DATE</span>
            <h3>{cap(monthFormat.format(month))}</h3>
          </div>
          <div className="calendar-nav">
            <button type="button" aria-label="Previous month" disabled={month <= firstMonth} onClick={() => shiftMonth(-1)}>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m15 18-6-6 6-6" />
              </svg>
            </button>
            <button type="button" aria-label="Next month" disabled={month >= lastMonth} onClick={() => shiftMonth(1)}>
              <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="m9 18 6-6-6-6" />
              </svg>
            </button>
          </div>
        </div>
        <div className="weekdays" aria-hidden="true">
          <span>Mon</span>
          <span>Tue</span>
          <span>Wed</span>
          <span>Thu</span>
          <span>Fri</span>
          <span>Sat</span>
          <span>Sun</span>
        </div>
        <div className="calendar-grid" aria-label="Calendar for the first session date">
          {cells.map((date, index) =>
            date ? (
              <button
                key={date.toISOString()}
                type="button"
                disabled={!dayIsOpen(date)}
                className={dayIsOpen(date) ? (sameContentDay(date, selected) ? 'selectable selected' : 'selectable') : undefined}
                aria-pressed={sameContentDay(date, selected)}
                onClick={() => setSelected(date)}
              >
                {date.getDate()}
              </button>
            ) : (
              <span key={`empty-${index}`} aria-hidden="true" />
            ),
          )}
        </div>
        <p className="calendar-hint">
          {calendarError ? (
            'The calendar could not be checked. Try again in a moment.'
          ) : (
            <>
              The selection is an <strong>availability request</strong>. It is not a confirmed booking.
            </>
          )}
        </p>
      </div>
      <div className="booking-card">
        <span className="eyebrow">CONTENT DAY REQUEST</span>
        {saved ? <p className="form-message">These details are the ones you entered before creating the account.</p> : null}
        <div className="booking-summary">
          <div>
            <small>First Content Day</small>
            <strong>{formatContentDay(selected)}</strong>
          </div>
          <div>
            <small>Hours</small>
            <strong>09:00 to 18:00</strong>
          </div>
        </div>
        <form className="booking-form" noValidate onSubmit={(event) => void submit(event)}>
          <div className="field">
            <label htmlFor={`${mode}-plan`}>Plan</label>
            <select
              id={`${mode}-plan`}
              value={plan}
              onChange={(event) => {
                if (isContentDayPlan(event.target.value)) setPlan(event.target.value)
              }}
            >
              <option value="monthly">Monthly, 890 € per month</option>
              <option value="quarterly">Quarterly, 850 € per month</option>
              <option value="semiannual">Half year, 800 € per month</option>
            </select>
          </div>
          <div className="field-row">
            <div className="field">
              <label htmlFor={`${mode}-name`}>Name</label>
              <input id={`${mode}-name`} value={name} autoComplete="name" placeholder="Your name" aria-invalid={invalid === 'name'} onChange={(event) => setName(event.target.value)} required />
            </div>
            <div className="field">
              <label htmlFor={`${mode}-email`}>Email</label>
              <input id={`${mode}-email`} type="email" value={email} autoComplete="email" placeholder="name@company.com" aria-invalid={invalid === 'email'} onChange={(event) => setEmail(event.target.value)} required />
            </div>
          </div>
          <div className="field">
            <label htmlFor={`${mode}-company`}>Company</label>
            <input id={`${mode}-company`} value={company} autoComplete="organization" placeholder="Company name" aria-invalid={invalid === 'company'} onChange={(event) => setCompany(event.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary booking-submit" disabled={calendarError}>
            {mode === 'ask' ? 'Continue' : 'Request availability'} <Arrow />
          </button>
          <p className={messageError ? 'form-message error' : 'form-message'} role="status">
            {message}
          </p>
        </form>
      </div>
    </div>
      {ready ? (
        <div className="booking-confirm" role="dialog" aria-modal="true" aria-label="Finish the Content Day request">
          <div className="booking-confirm-card">
            <span className="eyebrow">BEFORE THIS IS FINISHED</span>
            <h3>Create an account to keep this request.</h3>
            <p>
              {formatContentDay(selected)} with the {chosen.name} plan for {ready.company}. The same details will be waiting on your Content Day page.
            </p>
            <div className="booking-confirm-actions">
              <button type="button" className="btn btn-primary" onClick={() => continueToAccount(true)}>
                Create an account <Arrow />
              </button>
              <button type="button" className="btn btn-outline" onClick={() => continueToAccount(false)}>
                I already have an account
              </button>
              <button type="button" className="btn btn-outline" onClick={() => setReady(null)}>
                Keep editing
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </>
  )
}
