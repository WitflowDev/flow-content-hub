'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { confirmPasswordReset, signInWithEmailAndPassword, verifyPasswordResetCode } from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icons'
import { AuthShell } from '@/components/shell/AuthShell'
import { enterPlatform } from '@/components/screens/LoginScreen'
import { auth } from '@/lib/firebase'
import { establishSession } from '@/lib/firebase/browser-session'

const invalidLink = 'This reset link is invalid or has expired.'

export function ResetPasswordScreen() {
  const router = useRouter()
  const [ready, setReady] = useState(false)
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let cancelled = false

    async function prepare() {
      const params = new URLSearchParams(window.location.search)
      const oobCode = params.get('oobCode') ?? ''
      const mode = params.get('mode')
      if (!oobCode || (mode && mode !== 'resetPassword')) {
        if (!cancelled) setError(invalidLink)
        return
      }
      try {
        const accountEmail = await verifyPasswordResetCode(auth(), oobCode)
        if (cancelled) return
        setEmail(accountEmail)
        setCode(oobCode)
        setReady(true)
      } catch {
        if (!cancelled) setError(invalidLink)
      }
    }

    void prepare()
    return () => {
      cancelled = true
    }
  }, [])

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending || !code || !email) return
    const form = new FormData(event.currentTarget)
    const password = String(form.get('password') ?? '')
    const confirmation = String(form.get('confirmation') ?? '')
    if (password !== confirmation) {
      setError('Enter the same password in both fields.')
      return
    }
    setPending(true)
    setError('')
    try {
      await confirmPasswordReset(auth(), code, password)
      const credential = await signInWithEmailAndPassword(auth(), email, password)
      await establishSession(credential.user)
    } catch {
      setPending(false)
      setError('The password could not be saved. Request a new reset link and try again.')
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
