'use client'

import { Icon } from '@/components/icons'
import { CollectionFeature } from '@/components/collections/CollectionFeature'
import { ContentDayOffer } from '@/components/feedback/ContentDayOffer'
import { FlowTip } from '@/components/feedback/FlowTip'
import { GuideCard } from '@/components/guides/GuideCard'
import { MediaCard } from '@/components/media/MediaCard'
import { guides } from '@/data/guides'
import { greetingName } from '@/lib/greeting'
import type { InterfaceTheme } from '@/lib/interface-theme'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'
import { useSession } from '@/state/Session'

export function HomeScreen() {
  const { navigate, openDrawer } = useApp()
  const { media, collections } = useLibrary()
  const profile = useSession()
  const greeted = greetingName(profile.companyName, profile.name)
  const latest = collections[0]
  const hero = media[0]
  const bannerSrc = profile.bannerFileId
    ? `/api/brand/banner?v=${encodeURIComponent(profile.bannerFileId)}`
    : (hero?.src ?? '')

  return (
    <div className="page home-page">
      <HomeLead theme={profile.interfaceTheme} greeted={greeted} bannerSrc={bannerSrc} onAsk={openDrawer} />
      <ContentDayOffer />
      <section className="section section-tight">
        <div className="section-head">
          <div>
            <span className="section-kicker">Latest content</span>
            <h2>Recently added</h2>
          </div>
          <button type="button" className="link" onClick={() => navigate('/content', true)}>
            View all <Icon name="arrow" />
          </button>
        </div>
        <div className="media-grid home-media">
          {media.slice(0, 4).map((item) => (
            <MediaCard key={item.id} item={item} eager />
          ))}
        </div>
      </section>
      {latest ? (
        <section className="section latest-collection">
          <CollectionFeature collection={latest} />
        </section>
      ) : null}
      <section className="section">
        <div className="section-head">
          <div>
            <span className="section-kicker">Need a hand?</span>
            <h2>Quick guides</h2>
          </div>
          <button type="button" className="link" onClick={() => navigate('/guides', true)}>
            View all guides <Icon name="arrow" />
          </button>
        </div>
        <div className="guide-grid home-guides">
          {guides.slice(0, 3).map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
        </div>
      </section>
      <FlowTip title="We can help turn these assets into social posts, campaigns or website content." />
    </div>
  )
}

function HomeLead({
  theme,
  greeted,
  bannerSrc,
  onAsk,
}: {
  theme: InterfaceTheme
  greeted: string
  bannerSrc: string
  onAsk: () => void
}) {
  switch (theme) {
    case 'showroom':
      return (
        <section className="showroom-hero">
          {bannerSrc ? <img src={bannerSrc} alt="" /> : null}
          <div className="showroom-hero-fade" />
          <div className="showroom-hero-copy">
            <p>Flow Content Hub</p>
            <h1>Good morning, {greeted}.</h1>
            <button type="button" className="btn ghost" onClick={onAsk}>
              <Icon name="chat" /> Ask Flow
            </button>
          </div>
        </section>
      )
    case 'high-tech':
      return (
        <section className="tech-hero">
          <div>
            <p>Flow Content Hub</p>
            <h1>Good morning, {greeted}.</h1>
            <p className="tech-hero-note">Everything your brand has created with Flow, ready to use.</p>
          </div>
          <button type="button" className="btn primary" onClick={onAsk}>
            <Icon name="chat" /> Ask Flow
          </button>
        </section>
      )
    case 'institutional':
      return (
        <section className="civic-hero">
          <div>
            <p>Official archive</p>
            <h1>Good morning, {greeted}.</h1>
            <p className="civic-hero-note">Everything your brand has created with Flow, ready to use.</p>
          </div>
          <button type="button" className="btn primary" onClick={onAsk}>
            <Icon name="chat" /> Ask Flow
          </button>
        </section>
      )
    case 'minimalist':
      return (
        <section className="minimal-hero">
          <p>Flow Content Hub</p>
          <h1>Good morning, {greeted}.</h1>
          <div className="minimal-rule" />
          <p className="minimal-meta">Everything your brand has created with Flow, ready to use.</p>
          <button type="button" className="btn ghost" onClick={onAsk}>
            <Icon name="chat" /> Ask Flow
          </button>
        </section>
      )
    case 'studio':
      return (
        <header className="page-head home-head">
          <div className="page-title">
            <div className="eyebrow">Flow Content Hub</div>
            <h1>Good morning, {greeted}.</h1>
            <p>Everything your brand has created with Flow, ready to use.</p>
          </div>
          <div className="head-actions">
            <button type="button" className="btn ghost" onClick={onAsk}>
              <Icon name="chat" /> Ask Flow
            </button>
          </div>
        </header>
      )
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}
