'use client'

import type { ReactNode } from 'react'
import { GuideModal } from '@/components/guides/GuideModal'
import { NotificationPopover } from '@/components/feedback/NotificationPopover'
import { TalkDrawer } from '@/components/feedback/TalkDrawer'
import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { useApp } from '@/state/AppState'

export function Shell({ children }: { children: ReactNode }) {
  const { drawer, notifications, guide, mobileNav, toggleMobileNav } = useApp()

  return (
    <>
      <div className="app-shell">
        <Sidebar />
        <main className="main">
          <Topbar />
          {children}
        </main>
      </div>
      {drawer ? <TalkDrawer /> : null}
      {notifications ? <NotificationPopover /> : null}
      {guide ? <GuideModal id={guide} /> : null}
      {mobileNav ? <div className="mobile-scrim" onClick={toggleMobileNav} /> : null}
    </>
  )
}
