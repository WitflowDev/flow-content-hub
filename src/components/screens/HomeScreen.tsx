'use client'

import { Icon } from '@/components/icons'
import { CollectionFeature } from '@/components/collections/CollectionFeature'
import { FlowTip } from '@/components/feedback/FlowTip'
import { GuideCard } from '@/components/guides/GuideCard'
import { MediaCard } from '@/components/media/MediaCard'
import { guides } from '@/data/guides'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'
import { useSession } from '@/state/Session'

export function HomeScreen() {
  const { navigate, openDrawer } = useApp()
  const { media, collections } = useLibrary()
  const profile = useSession()
  const latest = collections[0]

  return (
    <div className="page home-page">
      <header className="page-head home-head">
        <div className="page-title">
          <div className="eyebrow">Flow Content Hub</div>
          <h1>Good morning, {profile.name || 'there'}.</h1>
          <p>Everything your brand has created with Flow, ready to use.</p>
        </div>
        <div className="head-actions">
          <button type="button" className="btn ghost" onClick={openDrawer}>
            <Icon name="chat" /> Ask Flow
          </button>
        </div>
      </header>
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
            <MediaCard key={item.id} item={item} />
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
