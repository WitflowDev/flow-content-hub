'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { ContentDayBooking } from '@/components/content-day/ContentDayBooking'
import { HubPreview } from '@/components/screens/HubPreview'
import { LOGO_BLACK, Logo } from '@/components/shell/Logo'
import { contentDayPlans as plans, type ContentDayPlanId as PlanId } from '@/lib/content-day'

type Lightbox = { src: string; title: string }

const socials = [
  {
    label: 'Facebook',
    href: 'https://www.facebook.com/flowproductions.pt',
    path: 'M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z',
  },
  {
    label: 'Instagram',
    href: 'https://www.instagram.com/flowproductions.pt',
    path: 'M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 1 0 0 12.324 6.162 6.162 0 0 0 0-12.324zM12 16a4 4 0 1 1 0-8 4 4 0 0 1 0 8zm6.406-11.845a1.44 1.44 0 1 0 0 2.881 1.44 1.44 0 0 0 0-2.881z',
  },
  {
    label: 'LinkedIn',
    href: 'https://www.linkedin.com/company/productions-flow/',
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 0 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@flowproductions1370',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
]

const shots = {
  filters: { src: '/assets/tutorials/filters.png', title: 'Content library' },
  collections: { src: '/assets/tutorials/collections.png', title: 'Collections by project' },
  guides: { src: '/assets/tutorials/reels.png', title: 'Guides and tips' },
}

function Arrow() {
  return (
    <svg className="icon" aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14m-5-5 5 5-5 5" />
    </svg>
  )
}

export function LandingScreen() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [plan, setPlan] = useState<PlanId>('quarterly')
  const [lightbox, setLightbox] = useState<Lightbox | null>(null)

  useEffect(() => {
    if (window.location.hash !== '#agenda') return
    document.getElementById('agenda')?.scrollIntoView({ block: 'start' })
  }, [])

  function choosePlan(id: PlanId, scroll: boolean) {
    setPlan(id)
    if (!scroll) return
    const behavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
    document.getElementById('agenda')?.scrollIntoView({ behavior, block: 'start' })
  }

  function closeMenu() {
    setMenuOpen(false)
  }

  return (
    <div className="landing day-landing">
      <a className="skip-link" href="#conteudo">
        Skip to content
      </a>
      <header className="site-header" id="topo">
        <div className="container header-inner">
          <a className="brand" href="#topo" aria-label="Flow Productions home">
            <img src={LOGO_BLACK} alt="Flow Productions" />
          </a>
          <nav className={menuOpen ? 'header-nav open' : 'header-nav'} aria-label="Main">
            <a href="#plataforma" onClick={closeMenu}>
              The platform
            </a>
            <a href="#contentday" onClick={closeMenu}>
              Content Day
            </a>
            <a href="#planos" onClick={closeMenu}>
              Plans
            </a>
            <Link href="/login" onClick={closeMenu}>
              Sign in
            </Link>
          </nav>
          <a href="#agenda" className="btn btn-primary header-cta">
            Book a Content Day <Arrow />
          </a>
          <button
            type="button"
            className="menu-toggle"
            aria-expanded={menuOpen}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            onClick={() => setMenuOpen((open) => !open)}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M4 7h16M4 12h16M4 17h16" />
            </svg>
          </button>
        </div>
      </header>

      <main id="conteudo">
        <section className="hero container" aria-labelledby="heroTitle">
          <div className="hero-content">
            <span className="eyebrow">
              <i className="eyebrow-dot" /> FLOW CONTENT DAY
            </span>
            <h1 id="heroTitle">
              New content.
              <br />
              <span>Every month.</span>
            </h1>
            <p>One production day each month. Video, photography and social posts, delivered in your Content Hub and ready to use.</p>
            <div className="hero-actions">
              <a href="#agenda" className="btn btn-primary">
                Request a date <Arrow />
              </a>
              <a href="#plataforma" className="btn btn-outline">
                Explore the Hub
              </a>
            </div>
            <div className="hero-meta">
              1 Content Day each month <span aria-hidden="true">·</span> 09:00 to 18:00 <span aria-hidden="true">·</span> Delivered in the Hub
            </div>
          </div>
          <div className="hero-media">
            <div className="browser-frame">
              <div className="frame-top">
                <div className="frame-label">
                  <span className="frame-dots" aria-hidden="true">
                    <i />
                    <i />
                    <i />
                  </span>
                  <span>Flow Content Hub</span>
                </div>
                <span className="frame-live">Preview</span>
              </div>
              <HubPreview />
            </div>
          </div>
        </section>

        <section className="section container" id="plataforma" aria-labelledby="hubTitle">
          <div className="section-heading">
            <div>
              <span className="eyebrow">THE CONTENT HUB</span>
              <h2 id="hubTitle">Your content, without the mess.</h2>
            </div>
            <p>A visual library. Everything where you expect to find it.</p>
          </div>
          <div className="feature-grid">
            <button type="button" className="feature-card" onClick={() => setLightbox(shots.filters)}>
              <div className="feature-visual">
                <img src={shots.filters.src} alt="Grid of videos and photographs in the Hub library" />
              </div>
              <div className="feature-caption">
                <div>
                  <strong>Library</strong>
                  <span>Find, filter and download.</span>
                </div>
              </div>
            </button>
            <button type="button" className="feature-card" onClick={() => setLightbox(shots.collections)}>
              <div className="feature-visual">
                <img src={shots.collections.src} alt="Collections with files grouped by project" />
              </div>
              <div className="feature-caption">
                <div>
                  <strong>Collections</strong>
                  <span>Each session in its own place.</span>
                </div>
              </div>
            </button>
            <button type="button" className="feature-card" onClick={() => setLightbox(shots.guides)}>
              <div className="feature-visual">
                <img src={shots.guides.src} alt="A video page in the Hub with suggested use and download" />
              </div>
              <div className="feature-caption">
                <div>
                  <strong>Guides and tips</strong>
                  <span>Visual help, kept simple.</span>
                </div>
              </div>
            </button>
          </div>
        </section>

        <section className="section contentday-section container" id="contentday" aria-labelledby="dayTitle">
          <div className="day-visual">
            <figure className="day-image day-image-main">
              <video src="/assets/mock_videos/reel_explainer.mp4" autoPlay muted loop playsInline />
              <figcaption>
                <span className="media-icon" aria-hidden="true">
                  <svg viewBox="0 0 24 24" fill="currentColor">
                    <path d="m8 5 11 7-11 7V5Z" />
                  </svg>
                </span>
                REEL
              </figcaption>
            </figure>
            <figure className="day-image day-image-secondary">
              <img src="/assets/guide_photos/recording_one.jpg" alt="Filming at an event with a stabilised camera" />
              <figcaption>PHOTOGRAPHY</figcaption>
            </figure>
          </div>
          <div className="day-content">
            <span className="eyebrow">THE CONTENT DAY PLAN</span>
            <h2 id="dayTitle">
              One day to create.
              <br />
              Content for the whole month.
            </h2>
            <p>
              Every month, one day for your brand, from <strong>09:00 to 18:00</strong>. We produce video and photography, prepare post materials and deliver everything organised in the Hub.
            </p>
            <div className="deliverables">
              <div>
                <strong>Video</strong>
                <span>Edited reels, ready to use</span>
              </div>
              <div>
                <strong>Photography</strong>
                <span>Professional selects and edits</span>
              </div>
              <div>
                <strong>Posts</strong>
                <span>Covers and base pieces for publishing</span>
              </div>
              <div>
                <strong>Content Hub</strong>
                <span>Private library, downloads and tips</span>
              </div>
            </div>
          </div>
        </section>

        <section className="section pricing-section container" id="planos" aria-labelledby="pricingTitle">
          <div className="section-heading pricing-heading">
            <div>
              <span className="eyebrow">MONTHLY PLANS</span>
              <h2 id="pricingTitle">The same Content Day. A plan that fits.</h2>
            </div>
            <p>Video, photography and post materials every month. The commitment sets the pace and the price.</p>
          </div>
          <div className="package-inclusions">
            <span className="package-intro">IN EACH CONTENT DAY</span>
            <span>09:00 to 18:00</span>
            <span>Up to 5 reels*</span>
            <span>Up to 40 photographs</span>
            <span>Posts, covers and Hub</span>
          </div>
          <div className="pricing-grid">
            <article className={plan === 'monthly' ? 'plan-card is-selected' : 'plan-card'}>
              <div className="plan-top">
                <span className="eyebrow">01 / FLEXIBILITY</span>
                <h3>Monthly</h3>
                <p>For refreshing the brand or launching a campaign with one clear goal.</p>
              </div>
              <div className="price">
                <strong>890 €</strong>
                <span>/ month plus VAT</span>
              </div>
              <div className="plan-cadence">
                <b>1 Content Day</b> <span>for 1 month</span>
              </div>
              <div className="plan-value">
                <span className="plan-value-label">WHY THIS PLAN</span>
                <strong>Start with flexibility.</strong>
                <p>One full production and delivery cycle, without a commitment of several months.</p>
              </div>
              <ul className="plan-benefits">
                <li>Video, photography and post materials*</li>
                <li>Finished content organised in the Hub</li>
                <li>One consolidated round of changes</li>
              </ul>
              <button type="button" className="btn btn-outline plan-btn" onClick={() => choosePlan('monthly', true)}>
                Choose monthly <Arrow />
              </button>
            </article>
            <article className={plan === 'quarterly' ? 'plan-card is-selected' : 'plan-card'}>
              <span className="plan-recommended">MOST CHOSEN</span>
              <div className="plan-top">
                <span className="eyebrow">02 / CONTINUITY</span>
                <h3>Quarterly</h3>
                <p>To keep the brand active for three months, with one production day each month.</p>
              </div>
              <div className="price">
                <strong>850 €</strong>
                <span>/ month plus VAT</span>
              </div>
              <div className="plan-cadence">
                <b>3 Content Days</b>
                <span>over 3 months</span>
                <small>Total 2,550 € plus VAT</small>
              </div>
              <div className="plan-value">
                <span className="plan-value-label">WHY THIS PLAN</span>
                <strong>Build a rhythm.</strong>
                <p>Three moments to create content that fits together and feeds seasonal campaigns.</p>
              </div>
              <ul className="plan-benefits">
                <li>Video, photography and post materials* each month</li>
                <li>3 collections organised in the Hub</li>
                <li>
                  <b>Save 120 €</b> compared with 3 months on the monthly plan
                </li>
              </ul>
              <button type="button" className="btn btn-outline plan-btn" onClick={() => choosePlan('quarterly', true)}>
                Choose quarterly <Arrow />
              </button>
            </article>
            <article className={plan === 'semiannual' ? 'plan-card is-selected' : 'plan-card'}>
              <div className="plan-top">
                <span className="eyebrow">03 / CONSISTENCY</span>
                <h3>Half year</h3>
                <p>For brands that need content often, across several moments in the year.</p>
              </div>
              <div className="price">
                <strong>800 €</strong>
                <span>/ month plus VAT</span>
              </div>
              <div className="plan-cadence">
                <b>6 Content Days</b>
                <span>over 6 months</span>
                <small>Total 4,800 € plus VAT</small>
              </div>
              <div className="plan-value">
                <span className="plan-value-label">WHY THIS PLAN</span>
                <strong>Build a living archive.</strong>
                <p>Regular production for different seasons, campaigns and brand content.</p>
              </div>
              <ul className="plan-benefits">
                <li>Video, photography and post materials* each month</li>
                <li>6 collections with history in the Hub</li>
                <li>
                  <b>Save 540 €</b> compared with 6 months on the monthly plan
                </li>
              </ul>
              <button type="button" className="btn btn-outline plan-btn" onClick={() => choosePlan('semiannual', true)}>
                Choose half year <Arrow />
              </button>
            </article>
          </div>
          <p className="plan-note">
            *Up to 5 edited reels or 1 short horizontal video per session, and up to 40 edited photographs. Simple covers, ideas and post materials are agreed in the brief. Publishing, social management and ads are not included. Hub access is for viewing and downloading the delivered files.
          </p>
        </section>

        <section className="section booking-section container" aria-labelledby="bookingTitle">
          <div className="section-heading">
            <div>
              <span className="eyebrow">CALENDAR</span>
              <h2 id="bookingTitle">Choose the first day.</h2>
            </div>
            <p>Pick a preferred date. We confirm it with you before booking.</p>
          </div>
          <ContentDayBooking mode="ask" plan={plan} onPlanChange={setPlan} />
        </section>
      </main>

      <footer className="landing-foot container">
        <div className="landing-foot-grid">
          <Logo />
          <div>
            <h2>Address</h2>
            <p className="landing-place">
              <b>Lisbon</b>
              Unicorn Factory Lisboa
              <br />
              Av. Infante Dom Henrique 143
              <br />
              1950-406 Lisboa, Portugal
            </p>
            <p className="landing-place">
              <b>Faro</b>
              Edifício Ualg Tec, Campus da Penha, 8005-139 Faro
            </p>
            <a className="landing-vr" href="https://www.flowproductions.pt/13587_Ficha%20Webiste.pdf" target="_blank" rel="noopener noreferrer">
              FLOW VR
            </a>
          </div>
          <div>
            <h2>Email</h2>
            <a className="landing-mail" href="mailto:info@flowproductions.pt">
              info@flowproductions.pt
            </a>
            <a className="landing-phone" href="tel:+351910814616">
              +351 910 814 616
            </a>
            <div className="landing-social">
              {socials.map((social) => (
                <a key={social.label} href={social.href} target="_blank" rel="noopener noreferrer" aria-label={social.label}>
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d={social.path} fill="currentColor" />
                  </svg>
                </a>
              ))}
            </div>
          </div>
        </div>
        <div className="landing-marks">
          <p>
            Flow Productions is duly recognised as a startup as of 1 April 2026, having demonstrated compliance with the requirements set out in Article 2 of Law No. 21/2023 of 25 May.
          </p>
          <img className="landing-signature" src="/assets/Barras%20de%20Assinaturas%20Algarve2030_Positivo.svg" alt="Algarve 2030 programme signature bars for co-financing" />
          <p>Flow Productions ©. All Rights Reserved.</p>
        </div>
      </footer>

      {lightbox ? (
        <div className="image-dialog" role="dialog" aria-modal="true" aria-label="Platform preview" onClick={() => setLightbox(null)}>
          <div className="image-panel" onClick={(event) => event.stopPropagation()}>
            <div className="dialog-head">
              <strong>{lightbox.title}</strong>
              <button type="button" aria-label="Close preview" onClick={() => setLightbox(null)}>
                <svg className="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" aria-hidden="true">
                  <path d="m6 6 12 12M18 6 6 18" />
                </svg>
              </button>
            </div>
            <img src={lightbox.src} alt={lightbox.title} />
          </div>
        </div>
      ) : null}
    </div>
  )
}
