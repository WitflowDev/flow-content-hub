'use client'

import { useState, type ChangeEvent, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { BusyButton } from '@/components/feedback/BusyButton'
import { Icon } from '@/components/icons'
import type { Collection } from '@/data/types'
import { sendPromotion } from '@/lib/notifications/actions'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'

export type PromotionAccount = {
  id: string
  label: string
}

export type AdminClient = {
  id: string
  label: string
  email: string
  hasFolder: boolean
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
  clients,
  clientCollections,
}: {
  clientCount: number
  publishedAssets: number
  draftCollections: number
  accounts: PromotionAccount[]
  clients: AdminClient[]
  clientCollections: Collection[]
}) {
  const { toast } = useApp()
  const router = useRouter()
  const { getMedia } = useLibrary()
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [audience, setAudience] = useState('all')
  const [sending, setSending] = useState(false)
  const [selected, setSelected] = useState<string[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const [uploadNotice, setUploadNotice] = useState('')
  const [fileLabel, setFileLabel] = useState('No file selected')
  const readyClients = clients.filter((client) => client.hasFolder)

  async function onSendPromotion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
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

  function onChooseFiles(event: ChangeEvent<HTMLInputElement>) {
    const list = event.target.files
    if (!list || list.length === 0) {
      setFileLabel('No file selected')
      return
    }
    setFileLabel(list.length === 1 ? list[0].name : `${list.length} files selected`)
  }

  function toggleClient(id: string) {
    setSelected((current) => (current.includes(id) ? current.filter((item) => item !== id) : [...current, id]))
  }

  function toggleReadyClients() {
    const ready = readyClients.map((client) => client.id)
    setSelected((current) => (ready.every((id) => current.includes(id)) ? [] : ready))
  }

  async function onUpload(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (uploading) return
    const formElement = event.currentTarget
    const form = new FormData(formElement)
    const files = form.getAll('file').filter((entry): entry is File => entry instanceof File && entry.size > 0)
    setUploadError('')
    setUploadNotice('')
    if (files.length === 0) {
      setUploadError('Choose a photo or video.')
      return
    }
    if (selected.length === 0) {
      setUploadError('Choose at least one client.')
      return
    }
    const body = new FormData()
    for (const file of files) body.append('file', file)
    for (const id of selected) body.append('clientId', id)
    setUploading(true)
    try {
      const response = await fetch('/api/admin/content', { method: 'POST', body })
      const result = (await response.json()) as { ok?: boolean; message?: string }
      if (!response.ok || !result.ok) {
        setUploadError(result.message || 'The file could not be saved.')
        return
      }
      formElement.reset()
      setFileLabel('No file selected')
      setUploadNotice(result.message || 'Content added.')
      router.refresh()
    } catch {
      setUploadError('The file could not be saved.')
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="page admin-page">
      <header className="page-head">
        <div className="page-title">
          <div className="eyebrow">Flow Admin</div>
          <h1>Clients and content</h1>
          <p>Upload photos and videos, then choose which clients can see them.</p>
        </div>
      </header>
      <form className="admin-tools" onSubmit={(event) => void onUpload(event)}>
        <section className="card admin-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Audience</div>
              <h2>Clients</h2>
            </div>
            <button type="button" className="link" onClick={toggleReadyClients} disabled={uploading || readyClients.length === 0}>
              {readyClients.every((client) => selected.includes(client.id)) && readyClients.length > 0 ? 'Clear' : 'Select all'}
            </button>
          </div>
          {clients.length === 0 ? <p className="admin-empty">No client accounts yet.</p> : null}
          <div className="client-list">
            {clients.map((client) => (
              <label className="client-choice" key={client.id}>
                <input
                  type="checkbox"
                  checked={selected.includes(client.id)}
                  disabled={!client.hasFolder || uploading}
                  onChange={() => toggleClient(client.id)}
                />
                <span>
                  <b>{client.label}</b>
                  <small>
                    {client.email || 'No email'}
                    {client.hasFolder ? '' : ' · No content folder'}
                  </small>
                </span>
              </label>
            ))}
          </div>
        </section>
        <section className="card admin-panel">
          <div className="panel-head">
            <div>
              <div className="eyebrow">Library</div>
              <h2>Upload content</h2>
            </div>
          </div>
          <p className="admin-help">Selected clients see the file in their own content folder. Photos and videos up to 80 MB.</p>
          <div className="field">
            <span className="field-label">Files</span>
            <div className="file-picker">
              <input
                id="content-file"
                className="file-picker-input"
                name="file"
                type="file"
                accept="image/*,video/*"
                multiple
                disabled={uploading}
                required
                onChange={onChooseFiles}
              />
              <label htmlFor="content-file" className="btn ghost">
                Choose files
              </label>
              <span>{fileLabel}</span>
            </div>
          </div>
          <BusyButton className="btn primary wide" type="submit" pending={uploading} pendingLabel="Uploading…" disabled={readyClients.length === 0}>
            <Icon name="upload" /> Add to selected clients
          </BusyButton>
          {uploading ? <p className="auth-status">Saving the files into the selected client folders.</p> : null}
          {uploadError ? <p className="admin-feedback error">{uploadError}</p> : null}
          {uploadNotice ? <p className="admin-feedback">{uploadNotice}</p> : null}
        </section>
      </form>
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
          <BusyButton type="submit" pending={sending} pendingLabel="Sending…">
            Send
          </BusyButton>
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
          {clientCollections.slice(0, 4).map((collection) => {
            const coverId = collection.cover[0]
            const cover = coverId ? getMedia(coverId) : null
            return (
              <div className="admin-row" key={collection.slug}>
                <div className="admin-thumb">
                  {cover ? <img src={cover.src} alt="" /> : null}
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
