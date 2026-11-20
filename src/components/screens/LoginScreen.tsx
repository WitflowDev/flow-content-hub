'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { FirebaseError } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  type User,
} from 'firebase/auth'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icons'
import { AuthShell } from '@/components/shell/AuthShell'
import { accountEntryPath } from '@/lib/auth/account'
import { registerAccount } from '@/lib/auth/register'
import { auth } from '@/lib/firebase'
import { establishSession } from '@/lib/firebase/browser-session'

type AuthMode = 'login' | 'signup' | 'forgot'

export async function enterPlatform(router: { push: (href: string) => void; refresh: () => void }) {
  const path = await accountEntryPath()
  router.push(path)
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

export function LoginScreen({ initialMode = 'login' }: { initialMode?: AuthMode }) {
  const router = useRouter()
  const [mode, setMode] = useState<AuthMode>(initialMode)
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
    if (mode === 'forgot') {
      try {
        await sendPasswordResetEmail(auth(), email, {
          url: `${window.location.origin}/reset-password`,
        })
      } catch {
        // The notice stays generic so the form does not reveal whether the email exists.
      }
      setPending(false)
      setNotice('If an account exists for that email, a reset link is on its way.')
      return
    }

    let user: User
    try {
      user = mode === 'signup' ? await openOrCreateAccount(email, password) : await signInAccount(email, password)
    } catch (error) {
      const current = signedInAccount(email)
      if (!current) {
        setPending(false)
        setError(messageFor(mode, error))
        return
      }
      user = current
    }

    try {
      await establishSession(user)
    } catch (error) {
      setPending(false)
      setError(messageFor(mode, error))
      return
    }

    if (mode === 'signup') {
      const result = await registerAccount({
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
    }

    try {
      await enterPlatform(router)
    } catch {
      setPending(false)
      setError('The account could not be opened.')
    }
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

async function signInAccount(email: string, password: string): Promise<User> {
  const credential = await signInWithEmailAndPassword(auth(), email, password)
  return credential.user
}

async function openOrCreateAccount(email: string, password: string): Promise<User> {
  try {
    const credential = await createUserWithEmailAndPassword(auth(), email, password)
    return credential.user
  } catch (error) {
    if (error instanceof FirebaseError && error.code === 'auth/email-already-in-use') {
      return signInAccount(email, password)
    }
    throw error
  }
}

function signedInAccount(email: string): User | null {
  const current = auth().currentUser
  if (!current?.email) return null
  return current.email.toLowerCase() === email.toLowerCase() ? current : null
}

function messageFor(mode: AuthMode, error: unknown): string {
  if (error instanceof Error && error.message === 'The session could not be saved.') {
    return 'The session could not be saved. Try again in a moment.'
  }
  if (mode === 'login' && isCredentialError(error)) {
    return 'Those details didn’t match. Check the email and password and try again.'
  }
  if (error instanceof FirebaseError && error.code === 'auth/weak-password') {
    return 'Use a password of at least 6 characters.'
  }
  if (error instanceof FirebaseError && error.code === 'auth/invalid-email') return 'Enter a valid email.'
  if (mode === 'login') return 'The account could not be opened.'
  return 'The account could not be saved.'
}

function isCredentialError(error: unknown): boolean {
  if (!(error instanceof FirebaseError)) return false
  switch (error.code) {
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
    case 'auth/invalid-email':
      return true
    default:
      return false
  }
}
