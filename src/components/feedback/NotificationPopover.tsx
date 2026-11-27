'use client'

import { useEffect, useRef } from 'react'
import { useApp } from '@/state/AppState'
import { useNotices } from '@/state/Notifications'
import type { AccountNotice } from '@/lib/notifications/types'

function noticeTime(createdAt: string): string {
  const elapsed = Date.now() - new Date(createdAt).getTime()
  const minute = 60_000
  const hour = 60 * minute
  const day = 24 * hour
  if (!Number.isFinite(elapsed) || elapsed < minute) return 'Just now'
  if (elapsed < hour) return `${Math.floor(elapsed / minute)} min`
  if (elapsed < day) return `${Math.floor(elapsed / hour)} h`
  if (elapsed < 2 * day) return 'Yesterday'
  return `${Math.floor(elapsed / day)} days`
}

function NotificationItem({ notice }: { notice: AccountNotice }) {
  return (
    <div className="notification">
      <span className={notice.unread ? 'dot on' : 'dot'} />
      <div>
        <p>
          <b>{notice.title}</b>
          {notice.body}
        </p>
        <small>{noticeTime(notice.createdAt)}</small>
      </div>
    </div>
  )
}

export function NotificationPopover() {
  const panelRef = useRef<HTMLDivElement>(null)
  const { closeNotifications } = useApp()
  const { notices, unread, markAllRead } = useNotices()

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      const target = event.target
      if (!(target instanceof Element)) return
      if (panelRef.current?.contains(target)) return
      if (target.closest('[data-notifications-trigger]')) return
      closeNotifications()
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') closeNotifications()
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [closeNotifications])

  return (
    <div ref={panelRef} className="popover notification-pop" role="dialog" aria-label="Notifications">
      <div className="popover-head">
        <h3>Notifications</h3>
        <button type="button" className="text-btn" disabled={!unread} onClick={() => void markAllRead()}>
          Mark all read
        </button>
      </div>
      {notices.length === 0 ? <p className="notification-empty">No notifications.</p> : null}
      {notices.map((notice) => (
        <NotificationItem key={notice.id} notice={notice} />
      ))}
    </div>
  )
}