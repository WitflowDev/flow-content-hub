'use client'

import { usePathname } from 'next/navigation'
import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { Logo } from '@/components/shell/Logo'
import { useApp } from '@/state/AppState'
import type { NavId } from '@/data/types'

const items: Array<{ id: NavId; label: string; url: string; icon: IconName }> = [
  { id: 'home', label: 'Home', url: '/home', icon: 'home' },
  { id: 'content', label: 'My Content', url: '/content', icon: 'folder' },
  { id: 'collections', label: 'Collections', url: '/collections', icon: 'layers' },
  { id: 'guides', label: 'Guides', url: '/guides', icon: 'book' },
]

function activeNav(pathname: string): NavId {
  if (pathname.startsWith('/asset') || pathname.startsWith('/content')) return 'content'
  if (pathname.startsWith('/collections') || pathname.startsWith('/collection/')) return 'collections'
  if (pathname.startsWith('/guides')) return 'guides'
  return 'home'
}

export function Sidebar() {
  const pathname = usePathname()
  const active = activeNav(pathname)
  const { mobileNav, navigate, openDrawer } = useApp()

  return (
    <aside className={mobileNav ? 'sidebar open' : 'sidebar'}>
      <button type="button" className="brand-btn" onClick={() => navigate('/home', true)}>
        <Logo />
      </button>
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
      </nav>
      <div className="sidebar-bottom">
        <button type="button" className="help-card" onClick={openDrawer}>
          <Icon name="chat" />
          <span>
            <b>Made by Flow</b>
            <small>Need help? Talk to us</small>
          </span>
          <span className="tiny-arrow">↗</span>
        </button>
      </div>
    </aside>
  )
}
