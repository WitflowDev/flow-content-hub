'use client'

import { useRouter } from 'next/navigation'
import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import { markNotificationsRead } from '@/lib/notifications/actions'
import type { AccountNotice } from '@/lib/notifications/types'
import { useApp } from '@/state/AppState'

type NotificationsContextValue = {
  notices: AccountNotice[]
  unread: boolean
  markAllRead: () => Promise<void>
}

const NotificationsContext = createContext<NotificationsContextValue | null>(null)

export function NotificationsProvider({ notices, children }: { notices: AccountNotice[]; children: ReactNode }) {
  const router = useRouter()
  const { toast } = useApp()
  const [items, setItems] = useState(notices)

  useEffect(() => {
    setItems(notices)
  }, [notices])

  const value = useMemo<NotificationsContextValue>(
    () => ({
      notices: items,
      unread: items.some((notice) => notice.unread),
      markAllRead: async () => {
        if (!items.some((notice) => notice.unread)) return
        try {
          await markNotificationsRead()
        } catch {
          toast('Notifications could not be updated.')
          return
        }
        setItems((current) => current.map((notice) => ({ ...notice, unread: false })))
        router.refresh()
      },
    }),
    [items, router, toast],
  )

  return <NotificationsContext.Provider value={value}>{children}</NotificationsContext.Provider>
}

export function useNotices(): NotificationsContextValue {
  const value = useContext(NotificationsContext)
  if (!value) throw new Error('useNotices must be used within NotificationsProvider')
  return value
}
