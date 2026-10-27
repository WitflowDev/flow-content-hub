'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { EmailOtpType } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icons'
import { AuthShell } from '@/components/shell/AuthShell'
import { createClient } from '@/lib/supabase/client'
import { enterPlatform } from '@/components/screens/LoginScreen'

const invalidLink = 'This reset link is invalid or has expired.'

function isEmailOtpType(value: string): value is EmailOtpType {
  switch (value) {
    case 'signup':
    case 'invite':
    case 'magiclink':
    case 'recovery':
    case 'email_change':
    case 'email':
      return true
    default:
      return false
  }
}

export function ResetPasswordScreen() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function prepare() {
      const supabase = createClient()
      const params = new URLSearchParams(window.location.search)
      const hash = new URLSearchParams(window.location.hash.replace(/^#/, ''))
      if (hash.get('error')) {
        if (!cancelled) setError(invalidLink)
        return
      }

      const tokenHash = params.get('token_hash')
      const type = params.get('type')
      const code = params.get('code')
      const { data: existing } = await supabase.auth.getUser()

      if (!existing.user && tokenHash && type && isEmailOtpType(type)) {
        await supabase.auth.verifyOtp({ type, token_hash: tokenHash })
      } else if (!existing.user && code) {
        await supabase.auth.exchangeCodeForSession(code)
      }

      const { data } = await supabase.auth.getUser()
      if (cancelled) return
      if (!data.user) {
        setError(invalidLink)
        return
      }
      setReady(true)
    }

    void prepare()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirmation = String(form.get('confirmation') ?? '')
    if (password !== confirmation) {
      setError('Enter the same password in both fields.')
      return
    }
    setPending(true)
    setError('')
    const supabase = createClient()
    const { error: updateError } = await supabase.auth.updateUser({ password })
    if (updateError) {
      setPending(false)
      setError(updateError.message)
      return
    }
    await enterPlatform(router)
  }

  return (
    <AuthShell>
      <form className="login-form card" onSubmit={onSubmit}>
        <div className="eyebrow">Private client area</div>
        <h2>Choose a new password.</h2>
        <p>This keeps the same account. Only the password changes.</p>
        {ready ? (
          <>
            <div className="field">
              <label htmlFor="reset-password">New password</label>
              <input id="reset-password" name="password" type="password" autoComplete="new-password" required minLength={6} />
            </div>
            <div className="field">
              <label htmlFor="reset-confirmation">Confirm password</label>
              <input
                id="reset-confirmation"
                name="confirmation"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
              />
            </div>
            <button className="btn primary wide" type="submit">
              Save password <Icon name="arrow" />
            </button>
          </>
        ) : null}
        {error ? <div className="demo-note">{error}</div> : null}
        {!ready && !error ? <div className="demo-note">Checking your reset link…</div> : null}
      </form>
    </AuthShell>
  )
}
