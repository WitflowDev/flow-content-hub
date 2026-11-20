'use server'

import { busyContentDayKeys, contentDayCalendarConfigured, createContentDayEvent } from '@/lib/calendar/content-day'
import { canRequestContentDay, contentDayPlans, firstContentDay, parseDateKey } from '@/lib/content-day'
import { markContentDayConfirmed, requestedContentDay } from '@/lib/content-day-requests'
import { requireAdmin } from '@/lib/auth/admin'

type Result = { ok: true } | { ok: false; message: string }

export async function confirmContentDay(input: { id: string }): Promise<Result> {
  const admin = await requireAdmin()
  if (!admin) return { ok: false, message: 'Only an admin can confirm a Content Day.' }
  if (!contentDayCalendarConfigured()) {
    return { ok: false, message: 'Google Calendar is not connected yet.' }
  }
  const request = await requestedContentDay(input.id)
  if (!request) return { ok: false, message: 'That Content Day request is no longer open.' }
  const date = parseDateKey(request.date)
  if (!date || !canRequestContentDay(date, firstContentDay().minDate)) {
    return { ok: false, message: 'That date can no longer be booked.' }
  }
  try {
    const busy = await busyContentDayKeys(request.date, request.date)
    if (busy.includes(request.date)) return { ok: false, message: 'That day is already taken on the calendar.' }
    const eventId = await createContentDayEvent({
      date: request.date,
      company: request.company,
      name: request.name,
      email: request.email,
      plan: contentDayPlans[request.plan].name,
    })
    await markContentDayConfirmed(request.id, eventId)
  } catch (error) {
    const message = error instanceof Error ? error.message : ''
    if (message.length > 0 && message.length <= 180) return { ok: false, message }
    return { ok: false, message: 'The Content Day could not be added to Google Calendar.' }
  }
  return { ok: true }
}
