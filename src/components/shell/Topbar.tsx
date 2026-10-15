'use client'

import type { FormEvent } from 'react'
import { Icon } from '@/components/icons'
import { useApp } from '@/state/AppState'

export function Topbar() {
  const { search, setSearch, setContentType, setChannel, navigate, toggleNotifications, toggleMobileNav } = useApp()

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
          <span className="badge-dot" />
        </button>
        <button type="button" className="avatar-btn" onClick={() => navigate('/settings')}>
          <span className="avatar">RF</span>
          <span className="chev">⌄</span>
        </button>
      </div>
    </header>
  )
}
