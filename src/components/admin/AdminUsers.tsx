'use client'

import { useEffect, useState } from 'react'
import type { AppRole } from '@/lib/auth'
import { parseRole } from '@/lib/auth'
import { createAdminUser, deleteAdminUser, loadAdminUsersPage, updateAdminUser } from '@/lib/admin/users'
import type { AdminUser } from '@/lib/admin/types'
import { useApp } from '@/state/AppState'
import { useSession } from '@/state/Session'

type Draft = {
  name: string
  email: string
  companyName: string
  role: AppRole
  password: string
}

type Editor = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; id: string }

const EMPTY_DRAFT: Draft = { name: '', email: '', companyName: '', role: 'client', password: '' }

export function AdminUsers() {
  const { toast } = useApp()
  const session = useSession()
  const [users, setUsers] = useState<AdminUser[]>([])
  const [page, setPage] = useState(1)
  const [pageCount, setPageCount] = useState(1)
  const [loading, setLoading] = useState(true)
  const [version, setVersion] = useState(0)
  const [editor, setEditor] = useState<Editor>({ mode: 'closed' })
  const [draft, setDraft] = useState<Draft>(EMPTY_DRAFT)
  const [busy, setBusy] = useState(false)
  const [pendingDelete, setPendingDelete] = useState('')

  useEffect(() => {
    let live = true
    setLoading(true)
    void loadAdminUsersPage(page).then((result) => {
      if (!live) return
      setLoading(false)
      if (!result.ok) {
        toast(result.message)
        return
      }
      setUsers(result.users)
      setPageCount(result.pageCount)
      if (result.page !== page) setPage(result.page)
    })
    return () => {
      live = false
    }
  }, [page, version, toast])

  function reload(nextPage = page) {
    setPage(nextPage)
    setVersion((current) => current + 1)
  }

  function openCreate() {
    setPendingDelete('')
    setDraft(EMPTY_DRAFT)
    setEditor({ mode: 'create' })
  }

  function openEdit(user: AdminUser) {
    setPendingDelete('')
    setDraft({
      name: user.name,
      email: user.email,
      companyName: user.companyName,
      role: user.role,
      password: '',
    })
    setEditor({ mode: 'edit', id: user.id })
  }

  function closeEditor() {
    setEditor({ mode: 'closed' })
    setDraft(EMPTY_DRAFT)
  }

  async function onSave() {
    if (busy) return
    setBusy(true)
    const result =
      editor.mode === 'edit'
        ? await updateAdminUser({ id: editor.id, ...draft })
        : await createAdminUser(draft)
    setBusy(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    toast(editor.mode === 'edit' ? 'Account updated' : 'Account created', 'success')
    closeEditor()
    reload(editor.mode === 'create' ? 1 : page)
  }

  async function onDelete(id: string) {
    if (busy) return
    setBusy(true)
    const result = await deleteAdminUser(id)
    setBusy(false)
    setPendingDelete('')
    if (!result.ok) {
      toast(result.message)
      return
    }
    if (editor.mode === 'edit' && editor.id === id) closeEditor()
    toast('Account deleted', 'success')
    reload(users.length === 1 && page > 1 ? page - 1 : page)
  }

  return (
    <section className="card admin-panel admin-users">
      <div className="panel-head">
        <div>
          <div className="eyebrow">Accounts</div>
          <h2>Users</h2>
        </div>
        <button type="button" className="btn primary" onClick={openCreate}>
          Add user
        </button>
      </div>
      {editor.mode === 'closed' ? null : (
        <form
          className="user-form"
          onSubmit={(event) => {
            event.preventDefault()
            void onSave()
          }}
        >
          <div className="field">
            <label htmlFor="user-name">Name</label>
            <input
              id="user-name"
              value={draft.name}
              autoComplete="name"
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="user-email">Email</label>
            <input
              id="user-email"
              type="email"
              required
              value={draft.email}
              autoComplete="off"
              onChange={(event) => setDraft({ ...draft, email: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="user-company">Company</label>
            <input
              id="user-company"
              value={draft.companyName}
              autoComplete="organization"
              onChange={(event) => setDraft({ ...draft, companyName: event.target.value })}
            />
          </div>
          <div className="field">
            <label htmlFor="user-role">Role</label>
            <select
              id="user-role"
              value={draft.role}
              disabled={editor.mode === 'edit' && editor.id === session.id}
              onChange={(event) => setDraft({ ...draft, role: parseRole(event.target.value) })}
            >
              <option value="client">Client</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          <div className="field field-span">
            <label htmlFor="user-password">{editor.mode === 'edit' ? 'New password' : 'Password'}</label>
            <input
              id="user-password"
              type="password"
              value={draft.password}
              autoComplete="new-password"
              minLength={editor.mode === 'create' ? 6 : undefined}
              required={editor.mode === 'create'}
              placeholder={editor.mode === 'edit' ? 'Leave blank to keep the current password' : ''}
              onChange={(event) => setDraft({ ...draft, password: event.target.value })}
            />
          </div>
          <div className="user-actions field-span">
            <button type="submit" className="btn primary" disabled={busy}>
              {busy ? 'Saving' : editor.mode === 'edit' ? 'Save changes' : 'Create account'}
            </button>
            <button type="button" className="btn" disabled={busy} onClick={closeEditor}>
              Cancel
            </button>
          </div>
        </form>
      )}
      {loading && users.length === 0 ? <p className="admin-empty">Loading accounts…</p> : null}
      {!loading && users.length === 0 ? <p className="admin-empty">No accounts yet.</p> : null}
      {users.map((user) => {
        const mine = user.id === session.id
        return (
          <div className="user-row" key={user.id}>
            <div>
              <b>
                {user.companyName || user.name || user.email || 'Account'}
                <span className="user-role">{roleLabel(user.role)}</span>
              </b>
              <small>
                {[user.name && user.companyName ? user.name : '', user.email, user.hasFolder ? 'Drive folder ready' : 'No Drive folder']
                  .filter(Boolean)
                  .join(' · ')}
              </small>
              {pendingDelete === user.id ? <small>The login is removed. The Drive folder stays.</small> : null}
            </div>
            <div className="user-actions">
              <button type="button" className="btn" onClick={() => openEdit(user)}>
                Edit
              </button>
              {mine ? null : pendingDelete === user.id ? (
                <>
                  <button type="button" className="btn" disabled={busy} onClick={() => void onDelete(user.id)}>
                    Delete account
                  </button>
                  <button type="button" className="btn" disabled={busy} onClick={() => setPendingDelete('')}>
                    Cancel
                  </button>
                </>
              ) : (
                <button type="button" className="btn" onClick={() => setPendingDelete(user.id)}>
                  Delete
                </button>
              )}
            </div>
          </div>
        )
      })}
      {pageCount > 1 ? (
        <div className="user-pages">
          <button type="button" className="btn" disabled={loading || page <= 1} onClick={() => setPage((current) => current - 1)}>
            Previous
          </button>
          <span>
            Page {page} of {pageCount}
          </span>
          <button type="button" className="btn" disabled={loading || page >= pageCount} onClick={() => setPage((current) => current + 1)}>
            Next
          </button>
        </div>
      ) : null}
    </section>
  )
}

function roleLabel(role: AppRole): string {
  switch (role) {
    case 'admin':
      return 'Admin'
    case 'client':
      return 'Client'
    default: {
      const unexpected: never = role
      return unexpected
    }
  }
}
