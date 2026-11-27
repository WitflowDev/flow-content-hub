'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { AppRole } from '@/lib/auth'
import { parseRole } from '@/lib/auth'
import { clearClientBanner, clearClientLogo, saveClientBanner, saveClientLogo } from '@/lib/admin/brand'
import { createAdminUser, deleteAdminUser, loadAdminUsersPage, updateAdminUser } from '@/lib/admin/users'
import type { AdminUser } from '@/lib/admin/types'
import { interfaceThemeLabel, readFlowLogo, readInterfaceTheme, type FlowLogo, type InterfaceTheme } from '@/lib/interface-theme'
import { paletteFromImage } from '@/lib/logo-colors'
import { startPreview } from '@/lib/preview/actions'
import { PALETTE_KEYS, defaultPalette, paletteHasOverrides, paletteLabel, resolvePalette, suggestedFlowLogo, type ThemePalette } from '@/lib/theme-palette'
import { useApp } from '@/state/AppState'
import { useSession } from '@/state/Session'

type Draft = {
  name: string
  email: string
  companyName: string
  role: AppRole
  password: string
  interfaceTheme: InterfaceTheme
  flowLogo: FlowLogo
  themeColors: ThemePalette
}

type Editor = { mode: 'closed' } | { mode: 'create' } | { mode: 'edit'; id: string }

const EMPTY_DRAFT: Draft = {
  name: '',
  email: '',
  companyName: '',
  role: 'client',
  password: '',
  interfaceTheme: 'studio',
  flowLogo: 'black',
  themeColors: defaultPalette('studio'),
}

export function AdminUsers() {
  const { toast } = useApp()
  const router = useRouter()
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
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState('')
  const [existingLogo, setExistingLogo] = useState('')
  const [logoFolder, setLogoFolder] = useState(false)
  const [bannerFile, setBannerFile] = useState<File | null>(null)
  const [bannerPreview, setBannerPreview] = useState('')
  const [existingBanner, setExistingBanner] = useState('')
  const [colorsFromLogo, setColorsFromLogo] = useState(false)
  const draftRef = useRef(draft)
  draftRef.current = draft
  const logoPreviewRef = useRef(logoPreview)
  logoPreviewRef.current = logoPreview
  const bannerPreviewRef = useRef(bannerPreview)
  bannerPreviewRef.current = bannerPreview

  useEffect(() => {
    return () => {
      if (logoPreviewRef.current.startsWith('blob:')) URL.revokeObjectURL(logoPreviewRef.current)
      if (bannerPreviewRef.current.startsWith('blob:')) URL.revokeObjectURL(bannerPreviewRef.current)
    }
  }, [])

  const logoSrc =
    logoPreview ||
    (editor.mode === 'edit' && existingLogo
      ? `/api/brand/logo?user=${encodeURIComponent(editor.id)}&v=${encodeURIComponent(existingLogo)}`
      : '')

  useEffect(() => {
    if (!logoSrc) return
    let live = true
    void paletteFromImage(logoSrc, draft.interfaceTheme).then((palette) => {
      if (!live || !palette) return
      const current = draftRef.current
      if (current.interfaceTheme !== draft.interfaceTheme) return
      const freshUpload = logoSrc.startsWith('blob:')
      if (!freshUpload && paletteHasOverrides(current.interfaceTheme, current.themeColors)) return
      setColorsFromLogo(true)
      if (PALETTE_KEYS.every((key) => current.themeColors[key] === palette[key])) return
      setDraft((latest) => {
        if (latest.interfaceTheme !== draft.interfaceTheme) return latest
        return {
          ...latest,
          themeColors: palette,
          flowLogo: suggestedFlowLogo(latest.interfaceTheme, palette.background),
        }
      })
    })
    return () => {
      live = false
    }
  }, [logoSrc, draft.interfaceTheme])

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
    setColorsFromLogo(false)
    chooseLogo(null)
    setExistingLogo('')
    setLogoFolder(false)
    setExistingBanner('')
    chooseBanner(null)
    setDraft(EMPTY_DRAFT)
    setEditor({ mode: 'create' })
  }

  function openEdit(user: AdminUser) {
    setPendingDelete('')
    setColorsFromLogo(false)
    chooseLogo(null)
    setExistingLogo(user.logoFileId ?? '')
    setLogoFolder(user.hasFolder)
    setExistingBanner(user.bannerFileId ?? '')
    chooseBanner(null)
    setDraft({
      name: user.name,
      email: user.email,
      companyName: user.companyName,
      role: user.role,
      password: '',
      interfaceTheme: user.interfaceTheme,
      flowLogo:
        user.flowLogo ??
        suggestedFlowLogo(user.interfaceTheme, resolvePalette(user.interfaceTheme, user.themeColors).background),
      themeColors: resolvePalette(user.interfaceTheme, user.themeColors),
    })
    setEditor({ mode: 'edit', id: user.id })
  }

  function closeEditor() {
    setColorsFromLogo(false)
    setEditor({ mode: 'closed' })
    setDraft(EMPTY_DRAFT)
    chooseLogo(null)
    setExistingBanner('')
    chooseBanner(null)
  }

  function chooseLogo(file: File | null) {
    setLogoPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current)
      return file ? URL.createObjectURL(file) : ''
    })
    setLogoFile(file)
  }

  function chooseBanner(file: File | null) {
    setBannerPreview((current) => {
      if (current.startsWith('blob:')) URL.revokeObjectURL(current)
      return file ? URL.createObjectURL(file) : ''
    })
    setBannerFile(file)
  }

  async function onPreview(userId: string) {
    const result = await startPreview(userId)
    if (result && !result.ok) toast(result.message)
  }

  async function onSave() {
    if (busy) return
    setBusy(true)
    const editingId = editor.mode === 'edit' ? editor.id : ''
    const result =
      editor.mode === 'edit'
        ? await updateAdminUser({ id: editor.id, ...draft })
        : await createAdminUser(draft)
    if (!result.ok) {
      setBusy(false)
      toast(result.message)
      return
    }
    const accountId = result.id || editingId
    let mediaError = ''
    if (logoFile && accountId) {
      const body = new FormData()
      body.set('userId', accountId)
      body.set('logo', logoFile)
      const uploaded = await saveClientLogo(body)
      if (!uploaded.ok) mediaError = uploaded.message
    }
    if (bannerFile && accountId && draft.interfaceTheme === 'showroom') {
      const body = new FormData()
      body.set('userId', accountId)
      body.set('banner', bannerFile)
      const uploaded = await saveClientBanner(body)
      if (!uploaded.ok) mediaError = mediaError || uploaded.message
    }
    setBusy(false)
    if (mediaError) {
      toast(`Account saved, but brand upload failed: ${mediaError}`)
    } else {
      toast(editor.mode === 'edit' ? 'Account updated' : 'Account created', 'success')
    }
    const created = editor.mode === 'create'
    closeEditor()
    reload(created ? 1 : page)
    router.refresh()
  }

  async function onRemoveLogo() {
    if (busy || editor.mode !== 'edit') return
    setBusy(true)
    const result = await clearClientLogo(editor.id)
    setBusy(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    setExistingLogo('')
    chooseLogo(null)
    toast('Logo removed', 'success')
    if (editor.id === session.id) router.refresh()
    reload(page)
  }

  async function onRemoveBanner() {
    if (busy || editor.mode !== 'edit') return
    setBusy(true)
    const result = await clearClientBanner(editor.id)
    setBusy(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    setExistingBanner('')
    chooseBanner(null)
    toast('Banner removed', 'success')
    if (editor.id === session.id) router.refresh()
    reload(page)
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
    router.refresh()
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
            <p className="field-note">Shown as “Good morning, this name.”</p>
          </div>
          <div className="field field-span">
            <label htmlFor="user-logo">Company logo</label>
            {logoPreview || (editor.mode === 'edit' && existingLogo) ? (
              <span className="client-mark client-mark-settings">
                <img
                  src={
                    logoPreview ||
                    (editor.mode === 'edit' ? `/api/brand/logo?user=${encodeURIComponent(editor.id)}&v=${encodeURIComponent(existingLogo)}` : '')
                  }
                  alt=""
                />
              </span>
            ) : null}
            <input
              id="user-logo"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              disabled={editor.mode === 'edit' && !logoFolder}
              onChange={(event) => chooseLogo(event.target.files?.[0] ?? null)}
            />
            <p className="field-note">
              {editor.mode === 'edit' && !logoFolder
                ? 'This account needs a Drive folder before a logo can be added.'
                : 'Shown in the sidebar, beside the Flow logo. PNG, JPG or WebP, up to 2 MB.'}
            </p>
            {editor.mode === 'edit' && existingLogo ? (
              <button type="button" className="btn" disabled={busy} onClick={() => void onRemoveLogo()}>
                Remove logo
              </button>
            ) : null}
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
          <div className="field">
            <label htmlFor="user-theme">Interface</label>
            <select
              id="user-theme"
              value={draft.interfaceTheme}
              onChange={(event) => {
                const theme = readInterfaceTheme(event.target.value)
                if (!theme) return
                setColorsFromLogo(false)
                const themeColors = defaultPalette(theme)
                setDraft({
                  ...draft,
                  interfaceTheme: theme,
                  themeColors,
                  flowLogo: suggestedFlowLogo(theme, themeColors.background),
                })
              }}
            >
              <option value="studio">Studio</option>
              <option value="showroom">Showroom</option>
              <option value="minimalist">Minimalist</option>
              <option value="high-tech">High Tech</option>
              <option value="institutional">Institutional</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor="user-flow-logo">Flow logo</label>
            <select
              id="user-flow-logo"
              value={draft.flowLogo}
              onChange={(event) => {
                const flowLogo = readFlowLogo(event.target.value)
                if (!flowLogo) return
                setDraft({ ...draft, flowLogo })
              }}
            >
              <option value="black">Black</option>
              <option value="white">White</option>
            </select>
            <p className="field-note">Use white on a dark background and black on a light one.</p>
          </div>
          {draft.interfaceTheme === 'showroom' ? (
            <div className="field field-span">
              <label htmlFor="user-banner">Home banner</label>
              {bannerPreview || (editor.mode === 'edit' && existingBanner) ? (
                <img
                  className="banner-preview"
                  src={
                    bannerPreview ||
                    (editor.mode === 'edit'
                      ? `/api/brand/banner?user=${encodeURIComponent(editor.id)}&v=${encodeURIComponent(existingBanner)}`
                      : '')
                  }
                  alt=""
                />
              ) : null}
              <input
                id="user-banner"
                type="file"
                accept="image/png,image/jpeg,image/webp"
                disabled={editor.mode === 'edit' && !logoFolder}
                onChange={(event) => chooseBanner(event.target.files?.[0] ?? null)}
              />
              <p className="field-note">
                {editor.mode === 'edit' && !logoFolder
                  ? 'This account needs a Drive folder before a banner can be added.'
                  : 'Shown across the top of Home in Showroom. PNG, JPG or WebP, up to 8 MB. Without one, the latest asset is used.'}
              </p>
              {editor.mode === 'edit' && existingBanner ? (
                <button type="button" className="btn" disabled={busy} onClick={() => void onRemoveBanner()}>
                  Remove banner
                </button>
              ) : null}
            </div>
          ) : null}
          <div className="field field-span">
            <label id="user-colors">Theme colors</label>
            <div className="color-grid" role="group" aria-labelledby="user-colors">
              {PALETTE_KEYS.map((key) => (
                <label key={key}>
                  {paletteLabel(key)}
                  <input
                    type="color"
                    value={draft.themeColors[key]}
                    aria-label={paletteLabel(key)}
                    onChange={(event) => {
                      setColorsFromLogo(false)
                      const color = event.target.value.toLowerCase()
                      setDraft({
                        ...draft,
                        themeColors: { ...draft.themeColors, [key]: color },
                        ...(key === 'background' ? { flowLogo: suggestedFlowLogo(draft.interfaceTheme, color) } : {}),
                      })
                    }}
                  />
                </label>
              ))}
            </div>
            <div className="color-actions">
              <button
                type="button"
                className="btn"
                disabled={busy}
                onClick={() => {
                  setColorsFromLogo(false)
                  const themeColors = defaultPalette(draft.interfaceTheme)
                  setDraft({ ...draft, themeColors, flowLogo: suggestedFlowLogo(draft.interfaceTheme, themeColors.background) })
                }}
              >
                Reset colors
              </button>
              <p className="field-note">
                {colorsFromLogo
                  ? 'Taken from the company logo. Reset colors restores the theme defaults.'
                  : 'These are the theme defaults until you change them.'}
              </p>
            </div>
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
                <span className="user-role">{interfaceThemeLabel(user.interfaceTheme)}</span>
              </b>
              <small>
                {[user.name && user.companyName ? user.name : '', user.email, user.hasFolder ? 'Drive folder ready' : 'No Drive folder']
                  .filter(Boolean)
                  .join(' · ')}
              </small>
              {pendingDelete === user.id ? <small>The login is removed. The Drive folder stays.</small> : null}
            </div>
            <div className="user-actions">
              {mine ? null : (
                <button type="button" className="btn" onClick={() => void onPreview(user.id)}>
                  View as user
                </button>
              )}
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
