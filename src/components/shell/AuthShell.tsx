'use client'

import type { ReactNode } from 'react'
import { Logo } from '@/components/shell/Logo'

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="login-wrap">
      <section className="login-art">
        <div className="login-brand">
          <Logo theme="light" />
        </div>
        <div className="login-story">
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
        </div>
        <span className="login-foot">Flow with us.</span>
      </section>
      <section className="login-form-area">{children}</section>
    </div>
  )
}
