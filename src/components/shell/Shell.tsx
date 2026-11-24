'use client'

import { useEffect, type ReactNode } from 'react'
import { JetBrains_Mono, Montserrat, Public_Sans, Source_Serif_4 } from 'next/font/google'
import { GuideModal } from '@/components/guides/GuideModal'
import { NotificationPopover } from '@/components/feedback/NotificationPopover'
import { TalkDrawer } from '@/components/feedback/TalkDrawer'
import { Sidebar } from '@/components/shell/Sidebar'
import { Topbar } from '@/components/shell/Topbar'
import { useApp } from '@/state/AppState'
import { themeClassName } from '@/lib/interface-theme'
import { stopPreview } from '@/lib/preview/actions'
import { paletteHasOverrides, paletteStyle } from '@/lib/theme-palette'
import { useSession } from '@/state/Session'
import './blocks.css'
import './palette.css'
import './showroom.css'
import './minimalist.css'
import './high-tech.css'
import './institutional.css'

const showroomFont = Montserrat({
  subsets: ['latin'],
  weight: ['200', '300', '400', '600', '700'],
  display: 'swap',
})

const techMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-tech-mono',
  display: 'swap',
})

const civicSans = Public_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  display: 'swap',
})

const civicSerif = Source_Serif_4({
  subsets: ['latin'],
  weight: ['600', '700'],
  variable: '--font-civic-serif',
  display: 'swap',
})

export function Shell({ children }: { children: ReactNode }) {
  const { drawer, notifications, guide, mobileNav, toggleMobileNav } = useApp()
  const profile = useSession()
  const skin = themeClassName(profile.interfaceTheme)
  const custom = paletteHasOverrides(profile.interfaceTheme, profile.palette)
  const colors = paletteStyle(profile.interfaceTheme, profile.palette)
  const colorKey = JSON.stringify(colors)
  const themeClass = [
    skin,
    skin === 'theme-showroom' ? showroomFont.className : '',
    skin === 'theme-high-tech' || skin === 'theme-institutional' ? techMono.variable : '',
    skin === 'theme-institutional' ? civicSans.className : '',
    skin === 'theme-institutional' ? civicSerif.variable : '',
    custom && skin === '' ? 'palette-custom' : '',
    profile.preview ? 'is-preview' : '',
  ]
    .filter(Boolean)
    .join(' ')

  useEffect(() => {
    const body = document.body
    body.classList.remove('theme-showroom', 'theme-minimalist', 'theme-high-tech', 'theme-institutional', 'palette-custom')
    if (skin) body.classList.add(skin)
    if (custom && skin === '') body.classList.add('palette-custom')
    const applied = JSON.parse(colorKey) as Record<string, string>
    for (const [key, value] of Object.entries(applied)) body.style.setProperty(key, value)
    return () => {
      body.classList.remove('theme-showroom', 'theme-minimalist', 'theme-high-tech', 'theme-institutional', 'palette-custom')
      for (const key of Object.keys(applied)) body.style.removeProperty(key)
    }
  }, [skin, custom, colorKey])

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
