'use client'

import { useState } from 'react'
import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icons'
import { Logo } from '@/components/shell/Logo'
import { createClient } from '@/lib/supabase/client'

export function LoginScreen() {
  const router = useRouter()
  const [error, setError] = useState('')
  const [pending, setPending] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (pending) return
    const form = new FormData(event.currentTarget)
    const email = String(form.get('email') ?? '')
    const password = String(form.get('password') ?? '')
    setPending(true)
    setError('')

    const supabase = createClient()
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password })
    if (signInError) {
      setPending(false)
      setError('Those details didn’t match. Check the email and password and try again.')
      return
    }

    const { data: profile } = await supabase.from('profiles').select('onboarding_done').maybeSingle()
    router.push(profile?.onboarding_done ? '/home' : '/onboarding')
    router.refresh()
  }

  return (
    <div className="login-wrap">
      <section className="login-art">
        <div className="login-brand">
          <Logo theme="light" />
        </div>
        <div className="login-copy">
          <div className="eyebrow light">Flow Content Hub</div>
          <h1>
            Your content.
            <br />
            All in one place.
          </h1>
          <p>A private client space for everything Flow creates for your brand — organised, easy to use and ready whenever you need it.</p>
        </div>
        <div className="login-collage">
          <figure>
            <img src="/assets/media/surf_hd.jpg" alt="" />
          </figure>
          <figure>
            <img src="/assets/media/portrait_hd.jpg" alt="" />
          </figure>
          <figure>
            <img src="/assets/media/cliffs_hd.jpg" alt="" />
          </figure>
        </div>
        <span className="login-foot">Flow with us.</span>
      </section>
      <section className="login-form-area">
        <form className="login-form card" id="login-form" onSubmit={onSubmit}>
          <div className="eyebrow">Private client area</div>
          <h2>Welcome back.</h2>
          <p>Sign in to access your content library.</p>
          <div className="field">
            <label htmlFor="login-email">Email</label>
            <input id="login-email" name="email" type="email" autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" name="password" type="password" autoComplete="current-password" required />
          </div>
          <button className="btn primary wide" type="submit">
            Log in <Icon name="arrow" />
          </button>
          {error ? <div className="demo-note">{error}</div> : null}
        </form>
      </section>
    </div>
  )
}
