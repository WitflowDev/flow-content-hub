'use client'

import { useEffect, useLayoutEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { serviceCompanies, type ServiceCompany, type ServiceTheme } from '@/data/services'
import { useApp } from '@/state/AppState'

type Layout = 'desktop' | 'drawer'

type Flyout = {
  companyId: string
  themeId: string
  top: number
  left: number
}

export function ServiceMenu({ pathname }: { pathname: string }) {
  const { navigate } = useApp()
  const [layout, setLayout] = useState<Layout>('desktop')
  const [flyout, setFlyout] = useState<Flyout | null>(null)
  const closeTimer = useRef<number>(0)

  useEffect(() => {
    const drawer = window.matchMedia('(max-width: 900px)')
    const apply = () => setLayout(drawer.matches ? 'drawer' : 'desktop')
    apply()
    drawer.addEventListener('change', apply)
    return () => drawer.removeEventListener('change', apply)
  }, [])

  useEffect(() => {
    setFlyout(null)
  }, [pathname, layout])

  useEffect(() => () => window.clearTimeout(closeTimer.current), [])

  function cancelClose() {
    window.clearTimeout(closeTimer.current)
  }

  function scheduleClose() {
    cancelClose()
    closeTimer.current = window.setTimeout(() => setFlyout(null), 220)
  }

  function showFlyout(companyId: string, themeId: string, anchor: HTMLElement) {
    if (layout === 'drawer') return
    cancelClose()
    const rect = anchor.getBoundingClientRect()
    setFlyout({ companyId, themeId, top: rect.top, left: rect.right - 6 })
  }

  function openThemePage(companyId: string, themeId: string) {
    setFlyout(null)
    navigate(`/services/${companyId}/${themeId}`, true)
  }

  return (
    <div className={`svc svc-${layout}`}>
      <p className="svc-intro">See everything we can help you with.</p>
      <p className="svc-legend">
        {serviceCompanies.map((company) => (
          <span key={company.id}>
            <i className={`svc-dot ${company.id}`} aria-hidden="true" />
            {company.name}
          </span>
        ))}
      </p>
      <div className="svc-grid">
        {serviceCompanies.flatMap((company) =>
          company.themes.map((theme) => {
            const here = pathname === `/services/${company.id}/${theme.id}`
            const open = flyout?.companyId === company.id && flyout.themeId === theme.id
            return (
              <button
                key={`${company.id}-${theme.id}`}
                type="button"
                className={here ? (open ? 'svc-tile here on' : 'svc-tile here') : open ? 'svc-tile on' : 'svc-tile'}
                onMouseEnter={(event) => showFlyout(company.id, theme.id, event.currentTarget)}
                onMouseLeave={scheduleClose}
                onClick={() => openThemePage(company.id, theme.id)}
              >
                <i className={`svc-dot ${company.id}`} aria-hidden="true" />
                <span>{theme.title}</span>
              </button>
            )
          }),
        )}
      </div>
      {flyout ? <Flyout flyout={flyout} onEnter={cancelClose} onLeave={scheduleClose} onOpen={openThemePage} /> : null}
    </div>
  )
}

function Flyout({
  flyout,
  onEnter,
  onLeave,
  onOpen,
}: {
  flyout: Flyout
  onEnter: () => void
  onLeave: () => void
  onOpen: (companyId: string, themeId: string) => void
}) {
  const panel = useRef<HTMLDivElement>(null)
  const [top, setTop] = useState(flyout.top)
  const company = serviceCompanies.find((entry) => entry.id === flyout.companyId)
  const theme = company?.themes.find((entry) => entry.id === flyout.themeId)

  useLayoutEffect(() => {
    const node = panel.current
    if (!node) return
    const height = node.getBoundingClientRect().height
    const limit = window.innerHeight - 12
    setTop(Math.max(12, Math.min(flyout.top, limit - height)))
  }, [flyout.top, flyout.themeId])

  if (!company || !theme || typeof document === 'undefined') return null
  return createPortal(
    <div
      ref={panel}
      className={theme.services.length > 4 ? 'svc-flyout wide' : 'svc-flyout'}
      style={{ top, left: flyout.left }}
      onMouseEnter={onEnter}
      onMouseLeave={onLeave}
    >
      <ServiceList company={company} theme={theme} onOpen={onOpen} />
    </div>,
    document.body,
  )
}

function ServiceList({
  company,
  theme,
  onOpen,
}: {
  company: ServiceCompany
  theme: ServiceTheme
  onOpen: (companyId: string, themeId: string) => void
}) {
  return (
    <div className="svc-flyout-services">
      <button type="button" className="svc-flyout-title" onClick={() => onOpen(company.id, theme.id)}>
        <small>
          <i className={`svc-dot ${company.id}`} aria-hidden="true" />
          {company.name}
        </small>
        {theme.title}
      </button>
      <div className="svc-flyout-links">
        {theme.services.map((service) => (
          <a key={service.href} href={service.href} target="_blank" rel="noreferrer">
            <span>{service.title}</span>
            <i aria-hidden="true">↗</i>
          </a>
        ))}
      </div>
    </div>
  )
}
