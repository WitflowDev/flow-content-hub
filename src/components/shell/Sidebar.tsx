'use client'

import { useLayoutEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { ClientMark } from '@/components/shell/ClientMark'
import { Logo } from '@/components/shell/Logo'
import { ServiceMenu } from '@/components/shell/ServiceMenu'
import { useApp } from '@/state/AppState'
import { isShowroomTheme } from '@/lib/interface-theme'
import { useSession } from '@/state/Session'
import type { NavId } from '@/data/types'

const FLOW_VIDEO_WIDTH = 3440
const FLOW_VIDEO_HEIGHT = 1440
const FLOW_VIDEO = '/assets/video_flow/video_flow.mp4'
const FLOW_SITE = 'https://www.flowproductions.pt/en'

const items: Array<{ id: NavId; label: string; url: string; icon: IconName }> = [
  { id: 'home', label: 'Home', url: '/home', icon: 'home' },
  { id: 'content', label: 'My Content', url: '/content', icon: 'folder' },
  { id: 'collections', label: 'Collections', url: '/collections', icon: 'layers' },
  { id: 'guides', label: 'Guides', url: '/guides', icon: 'book' },
  { id: 'content-day', label: 'Content Day', url: '/content-day', icon: 'calendar' },
]

function activeNav(pathname: string): NavId | null {
  if (pathname.startsWith('/admin') || pathname.startsWith('/services')) return null
  if (pathname.startsWith('/content-day')) return 'content-day'
  if (pathname.startsWith('/asset') || pathname.startsWith('/content')) return 'content'
  if (pathname.startsWith('/collections') || pathname.startsWith('/collection/')) return 'collections'
  if (pathname.startsWith('/guides')) return 'guides'
  return 'home'
}

export function Sidebar() {
  const pathname = usePathname()
  const active = activeNav(pathname)
  const { mobileNav, navigate, toggleMobileNav } = useApp()
  const profile = useSession()
  const adminActive = pathname.startsWith('/admin')

  return (
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>
      {profile.logoFileId ? (
        <div className="brand-lockup">
          <button type="button" className="brand-btn" onClick={() => navigate('/home', true)}>
            <Logo theme={isShowroomTheme(profile.interfaceTheme) ? 'light' : 'dark'} />
          </button>
          <span className="brand-collab" aria-hidden="true">
            ×
          </span>
          <ClientMark />
        </div>
      ) : (
        <button type="button" className="brand-btn" onClick={() => navigate('/home', true)}>
          <Logo theme={isShowroomTheme(profile.interfaceTheme) ? 'light' : 'dark'} />
        </button>
      )}
      <div className="sidebar-body">
        <nav className="nav">
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              className={active === item.id ? 'nav-item active' : 'nav-item'}
              onClick={() => navigate(item.url, true)}
            >
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
          {profile.role === 'admin' ? (
            <button
              type="button"
              className={adminActive ? 'nav-item active' : 'nav-item'}
              onClick={() => navigate('/admin', true)}
            >
              <Icon name="grid" />
              <span>Admin Dashboard</span>
            </button>
          ) : null}
        </nav>
        <ServiceMenu pathname={pathname} />
        <SidebarTower />
        <div className="sidebar-contact">
          <p>Have a project in mind?</p>
          <span>Tell us the idea and we’ll point you to the next step.</span>
          <a
            href="https://www.flowproductions.pt/en/contactos"
            target="_blank"
            rel="noreferrer"
            onClick={() => {
              if (mobileNav) toggleMobileNav()
            }}
          >
            Talk to us
          </a>
        </div>
      </div>
    </aside>
  )
}

function SidebarTower() {
  const gapRef = useRef<HTMLDivElement>(null)
  const [room, setRoom] = useState(false)

  useLayoutEffect(() => {
    const gap = gapRef.current
    if (!gap) return
    const apply = () => {
      const needed = (gap.clientWidth * FLOW_VIDEO_HEIGHT) / FLOW_VIDEO_WIDTH + 8
      setRoom(gap.clientWidth > 0 && gap.clientHeight >= needed)
    }
    apply()
    const watch = new ResizeObserver(apply)
    watch.observe(gap)
    return () => watch.disconnect()
  }, [])

  return (
    <div className="sidebar-gap" ref={gapRef}>
      {room ? (
        <a className="sidebar-tower" href={FLOW_SITE} target="_blank" rel="noreferrer" aria-label="Flow Productions">
          <video src={FLOW_VIDEO} muted loop playsInline autoPlay preload="auto" />
        </a>
      ) : null}
    </div>
  )
}
