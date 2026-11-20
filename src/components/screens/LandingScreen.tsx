import Link from 'next/link'
import { Logo } from '@/components/shell/Logo'

const gaps = [
  {
    title: 'A different place every time',
    text: 'The last film is in an email, the selects are on a transfer link, and the brief is in another thread.',
  },
  {
    title: 'A folder with no brief',
    text: 'A set of strong files, and nothing on them that says which one is for the feed, the site, or the campaign.',
  },
  {
    title: 'The follow-up starts from zero',
    text: 'Asking for another crop means describing the file again, instead of pointing at the original.',
  },
]

const steps = [
  {
    title: 'Flow delivers the work',
    text: 'New files are added to your library and organised into collections when a project is ready.',
  },
  {
    title: 'You take what you need',
    text: 'Sign in, browse the latest content, and download the files for social, the website, or a campaign.',
  },
  {
    title: 'You ask for the next step',
    text: 'Guides show how to use the content. Talk to Flow when you want something adapted or made from scratch.',
  },
]

const trustedLogos = [
  { src: '/assets/trust_by_logos/aljustrel.png', alt: 'Aljustrel' },
  { src: '/assets/trust_by_logos/greencolab.png', alt: 'GreenCoLab' },
  { src: '/assets/trust_by_logos/ccdr.png', alt: 'CCDR' },
  { src: '/assets/trust_by_logos/emjogo.png', alt: 'emjogo' },
  { src: '/assets/trust_by_logos/fujifilm.png', alt: 'Fujifilm' },
  { src: '/assets/trust_by_logos/portugal-invitational.png', alt: 'Portugal Invitational' },
  { src: '/assets/trust_by_logos/pga-tour-champions.png', alt: 'PGA TOUR Champions' },
  { src: '/assets/trust_by_logos/castro-verde.png', alt: 'Município de Castro Verde' },
  { src: '/assets/trust_by_logos/faro.png', alt: 'Faro' },
  { src: '/assets/trust_by_logos/zion.png', alt: 'ZION Creative Artisans' },
  { src: '/assets/trust_by_logos/infralobo.png', alt: 'Infralobo' },
  { src: '/assets/trust_by_logos/nature-soul-food.png', alt: 'Nature Soul Food' },
  { src: '/assets/trust_by_logos/woodfinish.png', alt: 'woodfinish' },
  { src: '/assets/trust_by_logos/loule.png', alt: 'Loulé' },
  { src: '/assets/trust_by_logos/details.png', alt: 'Details' },
  { src: '/assets/trust_by_logos/indasa.png', alt: 'Indasa' },
  { src: '/assets/trust_by_logos/learnable.png', alt: 'Learnable' },
  { src: '/assets/trust_by_logos/clubstohire.png', alt: 'Clubs to Hire' },
  { src: '/assets/trust_by_logos/inframoura.png', alt: 'Inframoura' },
  { src: '/assets/trust_by_logos/zero.png', alt: 'ZERO' },
  { src: '/assets/trust_by_logos/supabase-logo-wordmark--light-DqU5XrIo.png', alt: 'Supabase' },
  { src: '/assets/trust_by_logos/techhub.png', alt: 'TechHub' },
  { src: '/assets/trust_by_logos/ualg.png', alt: 'Universidade do Algarve' },
  { src: '/assets/trust_by_logos/vilamoura.png', alt: 'Vilamoura' },
  { src: '/assets/trust_by_logos/algarve-stp-DUufmjBb.png', alt: 'Algarve STP' },
  { src: '/assets/trust_by_logos/amd-logo-emea-cAfc972V.png', alt: 'AMD' },
  { src: '/assets/trust_by_logos/dengun-black-BIKZu3ue.png', alt: 'Dengun' },
  { src: '/assets/trust_by_logos/descomunal_logo-CGQAddA7.jpg', alt: 'Descomunal' },
  { src: '/assets/trust_by_logos/lionheart-test-E2sVxee5.jpg', alt: 'Lionheart' },
  { src: '/assets/trust_by_logos/logo-IPBN-sWkP0Fqr.png', alt: 'IPBN' },
  { src: '/assets/trust_by_logos/logo_ETIC-Algarve-DE5MJMn2.png', alt: 'ETIC Algarve' },
  { src: '/assets/trust_by_logos/made-logo-black-CNPTOqT2.png', alt: 'MADE' },
  { src: '/assets/trust_by_logos/OpenAI-black-wordmark-BfYT-5-s.png', alt: 'OpenAI' },
  { src: '/assets/trust_by_logos/talking-therapy-v2-no-bg-BO7dZuMo.png', alt: 'Talking Therapy' },
  { src: '/assets/trust_by_logos/ualg-tec-B2R0ykns.png', alt: 'UAlg Tec' },
  { src: '/assets/trust_by_logos/Untitled.jpg', alt: 'Belvedere' },
]

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
    path: 'M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 1 1 0-4.124 2.062 2.062 0 0 1 0 4.124zM7.119 20.452H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z',
  },
  {
    label: 'YouTube',
    href: 'https://www.youtube.com/@flowproductions1370',
    path: 'M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z',
  },
]

const libraryFiles = [
  { src: '/assets/media/surf_hd.jpg', title: 'Surf Session Highlight', meta: 'Video · 00:28', tag: 'Instagram' },
  { src: '/assets/media/portrait_hd.jpg', title: 'Golden Hour Portrait', meta: 'Photography · JPG', tag: 'Website' },
  { src: '/assets/media/cliffs_hd.jpg', title: 'Coastal Overview', meta: 'Photography · JPG', tag: 'Campaign' },
]

export function LandingScreen() {
  return (
    <div className="landing">
      <header className="landing-bar">
        <Logo />
        <nav>
          <Link href="/login">Sign in</Link>
          <Link href="/login?mode=signup" className="btn primary">
            Create an account
          </Link>
        </nav>
      </header>
      <section className="landing-hero">
        <div className="landing-copy">
          <div className="eyebrow">Flow Content Hub</div>
          <h1>
            Your content. All in <em>one place.</em>
          </h1>
          <p>
            A private library for the photos, films and campaign files Flow makes for your brand. Open a collection, download
            what you need, and ask for the next version without losing the original.
          </p>
          <div className="landing-actions">
            <Link href="/login" className="btn primary large">
              Sign in
            </Link>
            <Link href="/login?mode=signup" className="btn ghost large">
              Create an account
            </Link>
          </div>
          <p className="landing-note">Your account. Your files. Nothing is shared with another brand.</p>
        </div>
        <div className="landing-window" aria-hidden="true">
          <div className="landing-window-bar">
            <i />
            <i />
            <i />
            <b>Your library</b>
          </div>
          <div className="landing-window-body">
            <div className="landing-preview-set">
              <div className="landing-mini-mosaic">
                {libraryFiles.map((file) => (
                  <img key={file.title} src={file.src} alt="" />
                ))}
              </div>
              <div>
                <small>Collection</small>
                <strong>Summer Content Day</strong>
                <em>12 files · ready to download</em>
              </div>
            </div>
            <ul className="landing-file-list">
              {libraryFiles.map((file) => (
                <li key={file.title}>
                  <img src={file.src} alt="" />
                  <div>
                    <b>{file.title}</b>
                    <small>{file.meta}</small>
                  </div>
                  <span>{file.tag}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="trusted" aria-label="Trusted by">
        <p className="trusted-label">Trusted by</p>
        <div className="trusted-viewport">
          <div className="trusted-track">
            {['a', 'b'].map((copy) => (
              <div className="trusted-set" key={copy} aria-hidden={copy === 'b'}>
                {trustedLogos.map((logo) => (
                  <span className="trusted-logo" key={`${copy}-${logo.src}`}>
                    <img src={logo.src} alt={copy === 'a' ? logo.alt : ''} />
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="landing-section landing-band">
        <div className="landing-section-head center">
          <div className="eyebrow">Before the library</div>
          <h2>The work is finished. Finding it takes longer than using it.</h2>
          <p>Flow already makes the content. The library is where your team keeps it, understands it, and asks for the next version.</p>
        </div>
        <div className="landing-gaps">
          {gaps.map((gap) => (
            <article key={gap.title} className="card">
              <h3>{gap.title}</h3>
              <p>{gap.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <div className="eyebrow">Inside your account</div>
          <h2>What you can actually do with a file.</h2>
        </div>

        <article className="landing-feature">
          <div>
            <h3>Grouped by the job, not by the day it was sent.</h3>
            <p>A content day or a campaign arrives as one collection. Open it, read what it is for, and download the set together.</p>
            <ul>
              <li>Photos and films from the same project stay together.</li>
              <li>The collection has its own description, written by Flow.</li>
              <li>Download one file or the whole set.</li>
            </ul>
          </div>
          <div className="landing-panel">
            <div className="landing-cover">
              <img src="/assets/media/surf_hd.jpg" alt="" />
              <img src="/assets/media/portrait_hd.jpg" alt="" />
              <img src="/assets/media/cliffs_hd.jpg" alt="" />
            </div>
            <div className="landing-cover-meta">
              <b>Summer Content Day</b>
              <span>12 files</span>
            </div>
            <p>Campaign stills and a short film, delivered as one collection.</p>
          </div>
        </article>

        <article className="landing-feature reverse">
          <div>
            <h3>Each file says where it belongs.</h3>
            <p>Search by name or tag, filter by photo or video, and read the suggested use before you download.</p>
            <ul>
              <li>Tags such as the channel or the campaign, written for that file.</li>
              <li>A suggested use, only when Flow has one to add.</li>
              <li>Photo and video stay separate when you filter.</li>
            </ul>
          </div>
          <div className="landing-panel">
            <div className="landing-file-card">
              <img src="/assets/media/cliffs_hd.jpg" alt="" />
              <div>
                <small>Photography</small>
                <b>Coastal Overview</b>
                <p>Wide frame for a web hero, a campaign page, or a destination post.</p>
                <div>
                  <span>Website</span>
                  <span>Summer</span>
                </div>
              </div>
            </div>
          </div>
        </article>

        <article className="landing-feature">
          <div>
            <h3>The next request stays on the original.</h3>
            <p>Need another crop, a film, or a new campaign? Send it from the asset. Flow opens that exact file, not a description of it.</p>
            <ul>
              <li>The request is tied to the photo or video you were looking at.</li>
              <li>Add a phone number if you want a call back.</li>
              <li>Guides sit next to the library when you want to use the work as it is.</li>
            </ul>
          </div>
          <div className="landing-panel">
            <div className="landing-request">
              <small>Talk to Flow</small>
              <b>Another crop of this frame</b>
              <p>Square version for the feed, keeping the coastline on the right.</p>
              <div>
                <img src="/assets/media/cliffs_hd.jpg" alt="" />
                <span>
                  Linked to
                  <strong>Coastal Overview</strong>
                </span>
              </div>
            </div>
          </div>
        </article>
      </section>

      <section className="landing-section">
        <div className="landing-section-head">
          <div className="eyebrow">How it works</div>
          <h2>From delivery to the next request.</h2>
        </div>
        <ol className="landing-steps">
          {steps.map((step, index) => (
            <li key={step.title}>
              <span>{index + 1}</span>
              <div>
                <h3>{step.title}</h3>
                <p>{step.text}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <footer className="landing-foot">
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
            <a
              className="landing-vr"
              href="https://www.flowproductions.pt/13587_Ficha%20Webiste.pdf"
              target="_blank"
              rel="noopener noreferrer"
            >
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
        <img
          className="landing-signature"
          src="/assets/Barras%20de%20Assinaturas%20Algarve2030_Positivo.svg"
          alt="Algarve 2030 programme signature bars — co-financing"
        />
        <div className="landing-legal">
          <p>
            Flow Productions is duly recognised as a startup as of 1 April 2026, having demonstrated compliance with the
            requirements set out in Article 2 of Law No. 21/2023 of 25 May.
          </p>
          <p>Flow Productions ©. All Rights Reserved.</p>
        </div>
      </footer>
    </div>
  )
}
