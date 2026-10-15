'use client'

import { useState } from 'react'
import { ONBOARDING_KEY } from '@/lib/auth'
import { useApp } from '@/state/AppState'

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
  const { navigate, toast, logout } = useApp()

  function replayOnboarding() {
    localStorage.removeItem(ONBOARDING_KEY)
    navigate('/onboarding')
  }

  return (
    <div className="page settings-page">
      <header className="page-head">
        <div className="page-title">
          <div className="eyebrow">Account</div>
          <h1>Profile & preferences</h1>
          <p>Manage your client account and demo settings.</p>
        </div>
      </header>
      <div className="settings-grid">
        <section className="card settings-card">
          <h3>Profile</h3>
          <div className="field">
            <label htmlFor="profile-name">Name</label>
            <input id="profile-name" defaultValue="Ricardo Fernandes" />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input id="profile-email" defaultValue="ricardo@demo.flow" />
          </div>
          <div className="field">
            <label htmlFor="profile-company">Company</label>
            <input id="profile-company" defaultValue="Flow Demo Client" />
          </div>
          <button type="button" className="btn primary" onClick={() => toast('Profile saved', 'success')}>
            Save changes
          </button>
        </section>
        <section className="card settings-card">
          <h3>Notifications</h3>
          <ToggleRow label="New content published" initiallyOn />
          <ToggleRow label="Collection ready" initiallyOn />
          <ToggleRow label="Flow tips" initiallyOn={false} />
          <hr />
          <h3>Demo controls</h3>
          <button type="button" className="btn ghost wide" onClick={replayOnboarding}>
            Replay onboarding
          </button>
          <button type="button" className="btn ghost wide" onClick={() => navigate('/admin', true)}>
            Open Flow Admin demo
          </button>
          <button type="button" className="btn danger wide" onClick={logout}>
            Log out
          </button>
        </section>
      </div>
    </div>
  )
}
