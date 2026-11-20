'use client'

import { useParams } from 'next/navigation'
import { Icon } from '@/components/icons'
import { findServiceTheme, serviceCompanies } from '@/data/services'
import { routeParam } from '@/lib/library'
import { useApp } from '@/state/AppState'

export function ServiceScreen() {
  const params = useParams()
  const { navigate } = useApp()
  const match = findServiceTheme(routeParam(params.company), routeParam(params.theme))
  if (!match) {
    return (
      <div className="page">
        <h1>This service area is not available.</h1>
      </div>
    )
  }
  const { company, theme } = match

  return (
    <div className="page service-page">
      <header className="page-head">
        <div className="page-title">
          <div className="eyebrow service-company">
            <i className={`svc-dot ${company.id}`} aria-hidden="true" />
            {company.name}
          </div>
          <h1>{theme.title}</h1>
          <p>{theme.summary}</p>
        </div>
        <a className="btn ghost" href={theme.directory} target="_blank" rel="noreferrer">
          {company.directoryLabel}
          <Icon name="arrow" />
        </a>
      </header>
      <article className="card service-lead">
        <p>{theme.body}</p>
      </article>
      <section className="section">
        <div className="section-head">
          <div>
            <span className="section-kicker">{company.name}</span>
            <h2>What this includes</h2>
          </div>
        </div>
        <div className="service-offers">
          {theme.services.map((service) => (
            <a key={service.href} className="card service-offer" href={service.href} target="_blank" rel="noreferrer">
              <div>
                <h3>{service.title}</h3>
                <p>{service.summary}</p>
              </div>
              <span>
                Open this service <Icon name="arrow" />
              </span>
            </a>
          ))}
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <span className="section-kicker">Connected work</span>
            <h2>What usually sits next to this</h2>
          </div>
        </div>
        <div className="service-related">
          {theme.related.map((link) => {
            const target = findServiceTheme(link.company, link.theme)
            if (!target) return null
            return (
              <button
                key={`${link.company}-${link.theme}`}
                type="button"
                className="card service-related-card"
                onClick={() => navigate(`/services/${target.company.id}/${target.theme.id}`, true)}
              >
                <small>
                  <i className={`svc-dot ${target.company.id}`} aria-hidden="true" />
                  {target.company.name}
                </small>
                <b>{target.theme.title}</b>
                <p>{link.note}</p>
                <span>
                  See this area <Icon name="arrow" />
                </span>
              </button>
            )
          })}
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <span className="section-kicker">All areas</span>
            <h2>The rest of Flow Productions and WitFlow</h2>
          </div>
        </div>
        <div className="service-index">
          {serviceCompanies.map((entry) => (
            <div key={entry.id} className="card service-index-group">
              <h3>
                <i className={`svc-dot ${entry.id}`} aria-hidden="true" />
                {entry.name}
              </h3>
              <div className="service-index-links">
                {entry.themes.map((item) => {
                  const current = entry.id === company.id && item.id === theme.id
                  return (
                    <button
                      key={item.id}
                      type="button"
                      className={current ? 'on' : undefined}
                      onClick={() => navigate(`/services/${entry.id}/${item.id}`, true)}
                    >
                      {item.title}
                    </button>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
