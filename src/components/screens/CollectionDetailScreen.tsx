'use client'

import { useParams } from 'next/navigation'
import { Icon } from '@/components/icons'
import { FlowTip } from '@/components/feedback/FlowTip'
import { MediaCard } from '@/components/media/MediaCard'
import { routeParam } from '@/lib/library'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'
import type { MediaItem } from '@/data/types'

function UsageCard({ item, kind, channel, copy }: { item: MediaItem; kind: string; channel: string; copy: string }) {
  return (
    <div className="usage-card">
      <img src={item.src} alt="" style={{ objectPosition: item.position }} />
      <div>
        <span>
          {kind} → <b>{channel}</b>
        </span>
        <p>{copy}</p>
      </div>
    </div>
  )
}

export function CollectionDetailScreen() {
  const params = useParams()
  const { navigate, openGuide, toast } = useApp()
  const library = useLibrary()
  const collection = library.getCollection(routeParam(params.slug))
  const items = library.collectionItems(collection)
  const covers = collection.cover.map((id) => library.getMedia(id))
  const first = covers[0]
  const second = covers[1]
  const third = covers[2]
  const lead = items[0] ?? first
  const support = items[1] ?? lead
  const hero = items[2] ?? lead
  if (!first || !second || !third || !lead || !support || !hero) return null
  const strip = [first, second, third, first, second]

  async function share() {
    try {
      await navigator.clipboard.writeText(window.location.href)
      toast('Collection link copied', 'success')
    } catch {
      toast('Share link ready', 'success')
    }
  }

  return (
    <div className="page collection-detail-page">
      <div className="breadcrumb">
        <button type="button" onClick={() => navigate('/collections', true)}>
          Collections
        </button>
        <span>›</span>
        <b>{collection.title}</b>
      </div>
      <div className="collection-hero-strip">
        {strip.map((item, index) => (
          <img key={`${item.id}-${index}`} src={item.src} alt="" style={{ objectPosition: item.position }} />
        ))}
      </div>
      <div className="collection-heading">
        <div>
          <div className="eyebrow">Collection</div>
          <h1>{collection.title}</h1>
          <p>
            {collection.count} assets <span>·</span> Updated {collection.date}
          </p>
          <p className="collection-desc">{collection.description}</p>
        </div>
        <div className="collection-actions">
          <button type="button" className="btn ghost" onClick={() => void share()}>
            <Icon name="share" /> Share collection
          </button>
          <a className="btn primary" href="/downloads/Summer_Content_Day_Sample.zip" download="">
            <Icon name="download" /> Download collection
          </a>
        </div>
      </div>
      <section className="usage-map card">
        <div className="usage-map-head">
          <div>
            <div className="eyebrow">Mini content map</div>
            <h2>How we imagined this content being used</h2>
          </div>
          <button type="button" className="link" onClick={() => openGuide('use-content')}>
            How this works <Icon name="arrow" />
          </button>
        </div>
        <div className="usage-flow">
          <UsageCard item={lead} kind="Reel" channel="Instagram" copy="Open with energy and movement." />
          <span className="usage-arrow">→</span>
          <UsageCard item={hero} kind="Photo" channel="Website" copy="Use as campaign or page hero imagery." />
          <span className="usage-arrow">→</span>
          <UsageCard item={support} kind="Photo" channel="LinkedIn" copy="Support brand story and behind-the-scenes posts." />
        </div>
      </section>
      <section className="section">
        <div className="section-head">
          <div>
            <span className="section-kicker">All assets</span>
            <h2>{collection.title}</h2>
          </div>
          <div className="inline-controls">
            <button type="button" className="pill active">
              All types
            </button>
            <button type="button" className="pill">
              Newest first
            </button>
          </div>
        </div>
        <div className="media-grid collection-assets">
          {library.collectionGridItems(collection).map((item, index) => (
            <MediaCard key={`${item.id}-${index}`} item={item} />
          ))}
        </div>
      </section>
      <FlowTip
        title="Turn these assets into a social plan. Flow can help with copy, scheduling and publishing."
        linkText="Explore social support"
      />
    </div>
  )
}
