'use client'

import { useState, type FormEvent } from 'react'
import { Icon } from '@/components/icons'
import { sendPromotion } from '@/lib/notifications/actions'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'

export type PromotionAccount = {
  id: string
  label: string
}

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

export function AdminScreen({
  clientCount,
  publishedAssets,
  draftCollections,
  accounts,
}: {
  clientCount: number
  publishedAssets: number
  draftCollections: number
  accounts: PromotionAccount[]
}) {
  const { toast } = useApp()
  const { collections, getMedia } = useLibrary()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [sending, setSending] = useState(false)

  async function onSendPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSending(true)
    const result = await sendPromotion({ title, message, audience })
    setSending(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    setTitle('')
    setMessage('')
    setAudience('all')
    toast('Promotion sent', 'success')
  }

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
        <StatCard label="Active clients" value={String(clientCount)} sub="Profiles" />
        <StatCard label="Published assets" value={String(publishedAssets)} sub="Live in the library" />
        <StatCard label="Open requests" value="4" sub="Talk to Flow" />
        <StatCard label="Draft collections" value={String(draftCollections)} sub="Awaiting publish" />
      </div>
      <section className="card admin-panel promotion-panel">
        <div className="panel-head">
          <div>
            <div className="eyebrow">Promotion</div>
            <h2>Send a notice</h2>
          </div>
        </div>
        <form className="promotion-form" onSubmit={(event) => void onSendPromotion(event)}>
          <div className="field">
            <label htmlFor="promotion-title">Title</label>
            <input id="promotion-title" value={title} onChange={(event) => setTitle(event.target.value)} maxLength={120} />
          </div>
          <div className="field">
            <label htmlFor="promotion-message">Message</label>
            <textarea id="promotion-message" value={message} onChange={(event) => setMessage(event.target.value)} maxLength={500} />
          </div>
          <div className="field">
            <label htmlFor="promotion-audience">Account</label>
            <select id="promotion-audience" value={audience} onChange={(event) => setAudience(event.target.value)}>
              <option value="all">All accounts</option>
              {accounts.map((account) => (
                <option key={account.id} value={account.id}>
                  {account.label}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" className="btn primary" disabled={sending}>
            Send
          </button>
        </form>
      </section>
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
                <span className={collection.published === false ? 'status' : 'status published'}>
                  {collection.published === false ? 'Draft' : 'Published'}
                </span>
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
