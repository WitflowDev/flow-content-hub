'use client'

import { useEffect, type ReactNode } from 'react'
import { Montserrat } from 'next/font/google'
import { GuideModal } from '@/components/guides/GuideModal'
import { NotificationPopover } from '@/components/feedback/NotificationPopover'
import { TalkDrawer } from '@/components/feedback/TalkDrawer'
import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { useApp } from '@/state/AppState'
import { isShowroomTheme } from '@/lib/interface-theme'
import { stopPreview } from '@/lib/preview/actions'
import { paletteHasOverrides, paletteStyle } from '@/lib/theme-palette'
import { useSession } from '@/state/Session'
import './palette.css'
import './showroom.css'

const showroomFont = Montserrat({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700'],
  display: 'swap',
})

export function Shell({ children }: { children: ReactNode }) {
  const { drawer, notifications, guide, mobileNav, toggleMobileNav } = useApp()
  const profile = useSession()
  const showroom = isShowroomTheme(profile.interfaceTheme)
  const custom = paletteHasOverrides(profile.interfaceTheme, profile.palette)
  const colors = paletteStyle(profile.interfaceTheme, profile.palette)
  const colorKey = JSON.stringify(colors)
  const themeClass = [
    showroom ? `theme-showroom ${showroomFont.className}` : '',
    custom && !showroom ? 'palette-custom' : '',
    profile.preview ? 'is-preview' : '',
  ]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    const body = document.body
    body.classList.toggle('theme-showroom', showroom)
    body.classList.toggle('palette-custom', custom && !showroom)
    const applied = JSON.parse(colorKey) as Record<string, string>
    for (const [key, value] of Object.entries(applied)) body.style.setProperty(key, value)
    return () => {
      body.classList.remove('theme-showroom', 'palette-custom')
      for (const key of Object.keys(applied)) body.style.removeProperty(key)
    }
  }, [showroom, custom, colorKey])

  return (
    <div className={themeClass || undefined} style={colors}>
      {profile.preview ? (
        <div className="preview-bar">
          <span>Previewing {profile.companyName || profile.name || profile.email}. Drafts are visible.</span>
          <button type="button" onClick={() => void stopPreview()}>
            Exit preview
          </button>
        </div>
      ) : null}
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
    </div>
  )
}
