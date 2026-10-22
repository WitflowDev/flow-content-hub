'use client'

import { useParams } from 'next/navigation'
import { Icon } from '@/components/icons'
import { TutorialImage } from '@/components/guides/TutorialImage'
import { MediaCard } from '@/components/media/MediaCard'
import { assetFormat, routeParam } from '@/lib/library'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail-row">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}

export function AssetScreen() {
  const params = useParams()
  const { navigate, openDrawer, openGuide, toast } = useApp()
  const { media, getMedia } = useLibrary()
  const item = getMedia(routeParam(params.id))
  const related = media.filter((entry) => entry.id !== item.id).slice(0, 4)
  const previous = related[0]
  const next = related[1]
  const guideId = item.type === 'Video' ? 'reels' : 'photos'

  return (
    <div className="page asset-page">
      <div className="asset-nav">
        <button type="button" className="text-btn" onClick={() => navigate('/content', true)}>
          ← Back to content
        </button>
        <div>
          {previous ? (
            <button type="button" className="text-btn" onClick={() => navigate(`/asset/${previous.id}`)}>
              ← Previous
            </button>
          ) : null}
          {next ? (
            <button type="button" className="text-btn" onClick={() => navigate(`/asset/${next.id}`)}>
              Next →
            </button>
          ) : null}
        </div>
      </div>
      <div className="asset-layout">
        <section className={item.type === 'Video' ? 'asset-preview card video' : 'asset-preview card'}>
          <img src={item.src} alt={item.title} style={{ objectPosition: item.position }} />
          {item.type === 'Video' ? (
            <>
              <button type="button" className="big-play" onClick={() => toast('Video preview — prototype', 'success')}>
                <Icon name="play" />
              </button>
              <div className="fake-player">
                <button type="button">
                  <Icon name="play" />
                </button>
                <span>00:00 / {item.duration}</span>
                <div className="player-line">
                  <i />
                </div>
                <span>◖))</span>
                <span>⛶</span>
              </div>
            </>
          ) : null}
        </section>
        <aside className="asset-info">
          <div className="eyebrow">{item.type}</div>
          <h1>{item.title}</h1>
          <p className="asset-sub">
            {item.file} <span>·</span> {item.duration || 'Final'} <span>·</span> {item.orientation}
          </p>
          <div className="asset-block">
            <h3>Recommended for</h3>
            <div className="recommend-pills">
              <span>{item.channel}</span>
              <span>{item.channel === 'Instagram' ? 'TikTok' : 'Instagram'}</span>
              <span>{item.channel === 'Ads' ? 'Meta Ads' : 'Campaigns'}</span>
            </div>
          </div>
          <div className="asset-block">
            <h3>Suggested use</h3>
            <p>{item.description}</p>
          </div>
          <a className="btn primary wide" href={item.src} download={`${item.id}.jpg`}>
            <Icon name="download" /> Download
          </a>
          <button type="button" className="btn soft wide" onClick={openDrawer}>
            <Icon name="chat" /> Need another format? Ask Flow
          </button>
        </aside>
      </div>
      <div className="asset-bottom">
        <section className="details-card card">
          <div className="eyebrow">Asset details</div>
          <h3>Technical information</h3>
          <DetailRow label="Version" value="Final" />
          <DetailRow label="Format" value={assetFormat(item.orientation)} />
          <DetailRow label="File size" value={item.size} />
          <DetailRow label="Collection" value={item.collection} />
          <div className="asset-tags">
            <span className="tag">Summer</span>
            <span className="tag blue">Lifestyle</span>
            <span className="tag green">Final</span>
          </div>
        </section>
        <section className="asset-guide card">
          <div className="asset-guide-copy">
            <div className="eyebrow">Flow Tip</div>
            <h3>
              {item.type === 'Video'
                ? 'The first seconds matter most. Lead with your strongest visual.'
                : 'Use the recommended crop before resizing the original asset.'}
            </h3>
            <button type="button" className="link" onClick={() => openGuide(guideId)}>
              Watch quick tutorial <Icon name="arrow" />
            </button>
          </div>
          <div className="asset-guide-gif">
            <TutorialImage id={guideId} alt="Quick content tutorial" />
          </div>
        </section>
      </div>
      <section className="section">
        <div className="section-head">
          <h2>More from this collection</h2>
          <button type="button" className="link" onClick={() => navigate('/collections', true)}>
            View collections <Icon name="arrow" />
          </button>
        </div>
        <div className="media-grid">
          {related.map((entry) => (
            <MediaCard key={entry.id} item={entry} />
          ))}
        </div>
      </section>
    </div>
  )
}
