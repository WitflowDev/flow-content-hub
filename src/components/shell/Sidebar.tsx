'use client'

import { usePathname } from 'next/navigation'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { Logo } from '@/components/shell/Logo'
import { ServiceMenu } from '@/components/shell/ServiceMenu'
import { useApp } from '@/state/AppState'
import { useSession } from '@/state/Session'
import type { NavId } from '@/data/types'

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
      <button type="button" className="brand-btn" onClick={() => navigate('/home', true)}>
        <Logo />
      </button>
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
