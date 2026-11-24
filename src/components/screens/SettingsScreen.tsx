'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { saveAccountName } from '@/lib/auth/account'
import { useApp } from '@/state/AppState'
import { useSession } from '@/state/Session'

function ToggleRow({ label, initiallyOn }: { label: string; initiallyOn: boolean }) {
  const [on, setOn] = useState(initiallyOn)

  return (
    <div className="toggle-row">
      <span>{label}</span>
      <button type="button" className={on ? 'toggle on' : 'toggle'} onClick={() => setOn((current) => !current)}>
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

  async function saveProfile() {
    if (profile.preview) return
    const nextName = name.trim()
    if (!nextName) {
      toast('Add a name before saving')
      return
    }
    const saved = await saveAccountName(nextName)
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
            <input id="profile-name" value={name} readOnly={profile.preview} onChange={(event) => setName(event.target.value)} />
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
            <button type="button" className="btn primary" onClick={() => void saveProfile()}>
              Save changes
            </button>
          )}
        </section>
        <section className="card settings-card">
          <h3>Notifications</h3>
          <ToggleRow label="New content published" initiallyOn />
          <ToggleRow label="Collection ready" initiallyOn />
          <ToggleRow label="Flow tips" initiallyOn={false} />
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
