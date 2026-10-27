'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icons'
import { AuthShell } from '@/components/shell/AuthShell'
import { registerAccount } from '@/lib/auth/register'
import { createClient } from '@/lib/supabase/client'

type AuthMode = 'login' | 'signup' | 'forgot'

const resetRedirectTo = 'http://localhost:3000/reset-password'

export async function enterPlatform(router: { push: (href: string) => void; refresh: () => void }) {
  const supabase = createClient()
  const { data: profile } = await supabase.from('profiles').select('onboarding_done').maybeSingle()
  router.push(profile?.onboarding_done ? '/home' : '/onboarding')
  router.refresh()
}

function copyFor(mode: AuthMode): { title: string; text: string } {
  switch (mode) {
    case 'login':
      return { title: 'Welcome back.', text: 'Sign in to access your content library.' }
    case 'signup':
      return { title: 'Create your account.', text: 'Use your company name, email, and a password to open a client account.' }
    case 'forgot':
      return { title: 'Reset your password.', text: 'Enter your email and we’ll send a link to choose a new one.' }
    default: {
      const unexpected: never = mode
      return unexpected
    }
  }
}

export function LoginScreen() {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>('login')
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [pending, setPending] = useState(false)
  const copy = copyFor(mode)

  function switchMode(next: AuthMode) {
    setMode(next)
    setError('')
    setNotice('')
    setPending(false)
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '').trim()
    const password = String(form.get('password') ?? '')
    setPending(true)
    setError('')
    setNotice('')
    const supabase = createClient()

    if (mode === 'forgot') {
      await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: resetRedirectTo,
      })
      setPending(false)
      setNotice('If an account exists for that email, a reset link is on its way.')
      return
    }

    if (mode === 'signup') {
      const result = await registerAccount(email, password, {
        companyName: String(form.get('companyName') ?? ''),
        taxNumber: String(form.get('taxNumber') ?? ''),
        address: String(form.get('address') ?? ''),
        postalCode: String(form.get('postalCode') ?? ''),
      })
      if (result.status === 'error') {
        setPending(false)
        setError(result.message)
        return
      }
      if (result.status === 'session') {
        await enterPlatform(router)
        return
      }
      setPending(false)
      setNotice('Check your email to confirm your account. You can sign in after that.')
      return
    }

    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setPending(false)
      setError('Those details didn’t match. Check the email and password and try again.')
      return
    }
    await enterPlatform(router)
  }

  const submitLabel = mode === 'login' ? 'Log in' : mode === 'signup' ? 'Create account' : 'Send reset link'

  return (
    <AuthShell>
      <form className="login-form card" id="login-form" onSubmit={onSubmit}>
        <div className="eyebrow">Private client area</div>
        <h2>{copy.title}</h2>
        <p>{copy.text}</p>
        {mode === 'signup' ? <p className="required-legend">* Required</p> : null}
        <div className="field">
          <label htmlFor="login-email">{mode === 'signup' ? 'Email *' : 'Email'}</label>
          <input id="login-email" name="email" type="email" autoComplete="username" required />
        </div>
        {mode === 'forgot' ? null : (
          <div className="field">
            <label htmlFor="login-password">{mode === 'signup' ? 'Password *' : 'Password'}</label>
            <input
              id="login-password"
              name="password"
              type="password"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              minLength={6}
            />
          </div>
        )}
        {mode === 'signup' ? (
          <>
            <div className="field">
              <label htmlFor="signup-company">Company name *</label>
              <input id="signup-company" name="companyName" type="text" autoComplete="organization" required />
            </div>
            <div className="field">
              <label htmlFor="signup-tax">Tax number (NIF)</label>
              <input id="signup-tax" name="taxNumber" type="text" autoComplete="off" />
            </div>
            <div className="field">
              <label htmlFor="signup-address">Address</label>
              <input id="signup-address" name="address" type="text" autoComplete="street-address" />
            </div>
            <div className="field">
              <label htmlFor="signup-postal">Postal code</label>
              <input id="signup-postal" name="postalCode" type="text" autoComplete="postal-code" />
            </div>
          </>
        ) : null}
        <button className="btn primary wide" type="submit">
          {submitLabel} <Icon name="arrow" />
        </button>
        {error ? <div className="demo-note">{error}</div> : null}
        {notice ? <div className="demo-note">{notice}</div> : null}
        <div className="login-switch">
          {mode === 'login' ? (
            <>
              <button type="button" className="text-btn" onClick={() => switchMode('forgot')}>
                Forgot password?
              </button>
              <button type="button" className="text-btn" onClick={() => switchMode('signup')}>
                Create an account
              </button>
            </>
          ) : (
            <button type="button" className="text-btn" onClick={() => switchMode('login')}>
              Back to log in
            </button>
          )}
        </div>
      </form>
    </AuthShell>
  )
}
