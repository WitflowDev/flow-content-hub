'use client'

import type { FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { Icon } from '@/components/icons'
import { Logo } from '@/components/shell/Logo'
import { AUTH_KEY, ONBOARDING_KEY } from '@/lib/auth'

export function LoginScreen() {
  const router = useRouter()

  function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    localStorage.setItem(AUTH_KEY, '1')
    router.push(localStorage.getItem(ONBOARDING_KEY) ? '/home' : '/onboarding')
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
            <input id="login-email" type="email" defaultValue="ricardo@demo.flow" required />
          </div>
          <div className="field">
            <label htmlFor="login-password">Password</label>
            <input id="login-password" type="password" defaultValue="flowdemo" required />
          </div>
          <button className="btn primary wide" type="submit">
            Log in <Icon name="arrow" />
          </button>
          <div className="demo-note">Demo prototype — any email and password will open the platform.</div>
        </form>
      </section>
    </div>
  )
}
