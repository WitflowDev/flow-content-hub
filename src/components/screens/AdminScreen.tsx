'use client'

import { Icon } from '@/components/icons'
import { collections } from '@/data/collections'
import { getMedia } from '@/lib/library'
import { useApp } from '@/state/AppState'

const requests = [
  { title: 'Website refresh', person: 'RF', meta: 'Ricardo · 14 min ago', status: 'Open', statusClass: 'open' },
  { title: 'Paid Media adaptation', person: 'AP', meta: 'Ana · 2h ago', status: 'New', statusClass: 'new' },
  { title: 'New Content Day', person: 'LM', meta: 'Luis · Yesterday', status: 'New', statusClass: 'new' },
] as const

function StatCard({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div className="stat-card card">
      <span>{label}</span>
      <b>{value}</b>
      <small>{sub}</small>
    </div>
  )
}

export function AdminScreen() {
  const { toast } = useApp()

  return (
    <div className="page admin-page">
      <header className="page-head">
        <div className="page-title">
          <div className="eyebrow">Flow Admin · Demo</div>
          <h1>Content operations</h1>
          <p>Publish client content without touching the front-end code.</p>
        </div>
        <button type="button" className="btn primary" onClick={() => toast('Upload flow opened', 'success')}>
          <Icon name="upload" /> Upload assets
        </button>
      </header>
      <div className="admin-stats">
        <StatCard label="Active clients" value="12" sub="+2 this month" />
        <StatCard label="Published assets" value="486" sub="74 this month" />
        <StatCard label="Open requests" value="4" sub="Talk to Flow" />
        <StatCard label="Draft collections" value="3" sub="Awaiting publish" />
      </div>
      <div className="admin-layout">
        <section className="card admin-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Recent projects</div>
              <h2>Client collections</h2>
            </div>
            <button type="button" className="link">
              View all
            </button>
          </div>
          {collections.slice(0, 4).map((collection) => {
            const coverId = collection.cover[0]
            if (!coverId) return null
            const cover = getMedia(coverId)
            return (
              <div className="admin-row" key={collection.slug}>
                <div className="admin-thumb">
                  <img src={cover.src} alt="" />
                </div>
                <div>
                  <b>{collection.title}</b>
                  <small>Demo Client · {collection.count} assets</small>
                </div>
                <span className="status published">Published</span>
                <button type="button" className="kebab">
                  •••
                </button>
              </div>
            )
          })}
        </section>
        <section className="card admin-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Service requests</div>
              <h2>Talk to Flow</h2>
            </div>
          </div>
          {requests.map((request) => (
            <div className="request-row" key={request.title}>
              <span className="request-avatar">{request.person}</span>
              <div>
                <b>{request.title}</b>
                <small>{request.meta}</small>
              </div>
              <span className={`status ${request.statusClass}`}>{request.status}</span>
            </div>
          ))}
        </section>
      </div>
    </div>
  )
}
