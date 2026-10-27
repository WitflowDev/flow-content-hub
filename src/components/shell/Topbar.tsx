'use client'

import type { FormEvent } from 'react'
import { Icon } from '@/components/icons'
import { useApp } from '@/state/AppState'
import { useNotices } from '@/state/Notifications'
import { useSession } from '@/state/Session'

function accountInitials(name: string, email: string): string {
  const source = name.trim() || email.trim().split('@')[0] || ''
  const parts = source.split(/[\s._-]+/).filter((part) => part.length > 0)
  if (parts.length === 0) return ''
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase()
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
}

export function Topbar() {
  const { search, setSearch, setContentType, setChannel, navigate, toggleNotifications, toggleMobileNav } = useApp()
  const { unread } = useNotices()
  const profile = useSession()
  const initials = accountInitials(profile.name, profile.email)

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const field = event.currentTarget.elements.namedItem('q')
    const query = field instanceof HTMLInputElement ? field.value.trim() : ''
    setSearch(query)
    setContentType('All')
    setChannel('All')
    navigate('/content')
  }

  return (
    <header className="topbar">
      <button type="button" className="mobile-menu" onClick={toggleMobileNav} aria-label="Open menu">
        ☰
      </button>
      <form className="global-search" id="global-search-form" onSubmit={onSearch}>
        <Icon name="search" />
        <input
          id="global-search-input"
          name="q"
          key={search}
          defaultValue={search}
          placeholder="Search your content, collections or guides…"
          autoComplete="off"
        />
      </form>
      <div className="topbar-actions">
        <button type="button" className="icon-btn" onClick={toggleNotifications} aria-label="Notifications">
          <Icon name="bell" />
          {unread ? <span className="badge-dot" /> : null}
        </button>
        <button type="button" className="avatar-btn" onClick={() => navigate('/settings')}>
          <span className="avatar">{initials}</span>
          <span className="chev">⌄</span>
        </button>
      </div>
    </header>
  )
}
