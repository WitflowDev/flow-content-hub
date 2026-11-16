'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BusyButton } from '@/components/feedback/BusyButton'
import { createClient } from '@/lib/supabase/client'
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
  const { navigate, toast, logout } = useApp()
  const router = useRouter()
  const profile = useSession()
  const [name, setName] = useState(profile.name)
  const [saving, setSaving] = useState(false)
  const [replaying, setReplaying] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  async function saveProfile() {
    const nextName = name.trim()
    if (!nextName) {
      toast('Add a name before saving')
      return
    }
    if (saving) return
    setSaving(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ name: nextName }).eq('id', profile.id)
    setSaving(false)
    if (error) {
      toast('Could not save the profile')
      return
    }
    toast('Profile saved', 'success')
    router.refresh()
  }

  async function replayOnboarding() {
    if (replaying) return
    setReplaying(true)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ onboarding_done: false }).eq('id', profile.id)
    if (error) {
      setReplaying(false)
      toast('Could not open onboarding')
      return
    }
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
            <input id="profile-name" value={name} onChange={(event) => setName(event.target.value)} />
          </div>
          <div className="field">
            <label htmlFor="profile-email">Email</label>
            <input id="profile-email" value={profile.email} readOnly />
          </div>
          <div className="field">
            <label htmlFor="profile-company">Company</label>
            <input id="profile-company" defaultValue="" />
          </div>
          <BusyButton pending={saving} pendingLabel="Saving…" onClick={() => void saveProfile()}>
            Save changes
          </BusyButton>
          {saving ? <p className="auth-status">Saving your profile.</p> : null}
        </section>
        <section className="card settings-card">
          <h3>Notifications</h3>
          <ToggleRow label="New content published" initiallyOn />
          <ToggleRow label="Collection ready" initiallyOn />
          <ToggleRow label="Flow tips" initiallyOn={false} />
          <hr />
          <h3>Demo controls</h3>
          <BusyButton className="btn ghost wide" pending={replaying} pendingLabel="Opening…" onClick={() => void replayOnboarding()}>
            Replay onboarding
          </BusyButton>
          {profile.role === 'admin' ? (
            <button type="button" className="btn ghost wide" onClick={() => navigate('/admin', true)}>
              Open Flow Admin demo
            </button>
          ) : null}
          <BusyButton
            className="btn danger wide"
            pending={signingOut}
            pendingLabel="Signing out…"
            onClick={() => {
              setSigningOut(true)
              logout()
            }}
          >
            Log out
          </BusyButton>
        </section>
      </div>
    </div>
  )
}
