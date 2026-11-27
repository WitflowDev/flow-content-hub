'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveAccountName } from '@/lib/auth/account'
import { useApp } from '@/state/AppState'
import { useSession } from '@/state/Session'

type NotificationPrefs = {
  newContent: boolean
  collectionReady: boolean
  flowTips: boolean
}

const DEFAULT_PREFS: NotificationPrefs = {
  newContent: true,
  collectionReady: true,
  flowTips: false,
}

function readPrefs(userId: string): NotificationPrefs {
  try {
    const raw = window.localStorage.getItem(`flow-notify-prefs:${userId}`)
    if (!raw) return DEFAULT_PREFS
    const parsed = JSON.parse(raw) as Partial<NotificationPrefs>
    return {
      newContent: typeof parsed.newContent === 'boolean' ? parsed.newContent : DEFAULT_PREFS.newContent,
      collectionReady: typeof parsed.collectionReady === 'boolean' ? parsed.collectionReady : DEFAULT_PREFS.collectionReady,
      flowTips: typeof parsed.flowTips === 'boolean' ? parsed.flowTips : DEFAULT_PREFS.flowTips,
    }
  } catch {
    return DEFAULT_PREFS
  }
}

function writePrefs(userId: string, prefs: NotificationPrefs): void {
  try {
    window.localStorage.setItem(`flow-notify-prefs:${userId}`, JSON.stringify(prefs))
  } catch {
    // Ignore storage quota or private mode restrictions.
  }
}

function ToggleRow({
  label,
  on,
  disabled,
  onToggle,
}: {
  label: string
  on: boolean
  disabled?: boolean
  onToggle: () => void
}) {
  return (
    <div className="toggle-row">
      <span>{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={disabled}
        className={on ? 'toggle on' : 'toggle'}
        onClick={onToggle}
      >
        <i />
      </button>
    </div>
  )
}

export function SettingsScreen() {
  const { toast, logout } = useApp()
  const router = useRouter()
  const profile = useSession()
  const [name, setName] = useState(profile.name)
  const [saving, setSaving] = useState(false)
  const [prefs, setPrefs] = useState<NotificationPrefs>(DEFAULT_PREFS)

  useEffect(() => {
    setName(profile.name)
  }, [profile.name])

  useEffect(() => {
    setPrefs(readPrefs(profile.id))
  }, [profile.id])

  function togglePref(key: keyof NotificationPrefs) {
    if (profile.preview) return
    setPrefs((current) => {
      const next = { ...current, [key]: !current[key] }
      writePrefs(profile.id, next)
      return next
    })
  }

  async function saveProfile() {
    if (profile.preview || saving) return
    const nextName = name.trim()
    if (!nextName) {
      toast('Add a name before saving')
      return
    }
    setSaving(true)
    const saved = await saveAccountName(nextName).catch(() => false)
    setSaving(false)
    if (!saved) {
      toast('Could not save the profile')
      return
    }
    toast('Profile saved', 'success')
    router.refresh()
  }

  return (
    <div className="page settings-page">
      <header className="page-head">
        <div className="page-title">
          <div className="eyebrow">Account</div>
          <h1>Profile & preferences</h1>
          <p>Manage your client account.</p>
        </div>
      </header>
      <div className="settings-grid">
        <section className="card settings-card">
          <h3>Profile</h3>
          <div className="field">
            <label htmlFor="profile-name">Name</label>
            <input
              id="profile-name"
              value={name}
              readOnly={profile.preview}
              disabled={saving}
              onChange={(event) => setName(event.target.value)}
            />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input id="profile-email" value={profile.email} readOnly />
          </div>
          <div className="field">
            <label htmlFor="profile-company">Company</label>
            <input id="profile-company" value={profile.companyName} readOnly />
          </div>
          {profile.preview ? (
            <p className="field-note">Preview only. Exit preview to use your own account.</p>
          ) : (
            <button type="button" className="btn primary" disabled={saving} onClick={() => void saveProfile()}>
              {saving ? 'Saving…' : 'Save changes'}
            </button>
          )}
        </section>
        <section className="card settings-card">
          <h3>Notifications</h3>
          <ToggleRow
            label="New content published"
            on={prefs.newContent}
            disabled={profile.preview}
            onToggle={() => togglePref('newContent')}
          />
          <ToggleRow
            label="Collection ready"
            on={prefs.collectionReady}
            disabled={profile.preview}
            onToggle={() => togglePref('collectionReady')}
          />
          <ToggleRow
            label="Flow tips"
            on={prefs.flowTips}
            disabled={profile.preview}
            onToggle={() => togglePref('flowTips')}
          />
          <hr />
          <h3>Account</h3>
          <button type="button" className="btn danger wide" disabled={profile.preview} onClick={logout}>
            Log out
          </button>
        </section>
      </div>
    </div>
  )
}
