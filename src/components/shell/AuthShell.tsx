'use client'

import type { ReactNode } from 'react'
import Link from 'next/link'
import { LOGO_BLACK } from '@/components/shell/Logo'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="landing day-landing auth-page">
      <header className="site-header">
        <div className="container header-inner">
          <Link className="brand" href="/" aria-label="Flow Productions home">
            <img src={LOGO_BLACK} alt="Flow Productions" />
          </Link>
        </div>
      </header>
      <main>
        <section className="hero container">
          <div className="hero-content">
            <span className="eyebrow">
              <i className="eyebrow-dot" /> Flow Content Hub
            </span>
            <h1>
              Your content.
              <br />
              <span>All in one place.</span>
            </h1>
            <p>A private client space for everything Flow creates for your brand. Organised, easy to use and ready when you need it.</p>
          </div>
          <div className="auth-panel">{children}</div>
        </section>
      </main>
    </div>
  )
}
