'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { Icon } from '@/components/icons'
import { InstagramCarousel } from '@/components/collections/InstagramCarousel'
import { FlowTip } from '@/components/feedback/FlowTip'
import { MediaCard } from '@/components/media/MediaCard'
import { downloadDriveFiles } from '@/lib/downloadDriveFiles'
import { createCollectionShare } from '@/lib/share/actions'
import { FAVORITES_SLUG, favoritesCollection } from '@/lib/favorites'
import { isShowroomTheme } from '@/lib/interface-theme'
import { routeParam } from '@/lib/library'
import { useFavorites } from '@/state/Favorites'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'
import { useSession } from '@/state/Session'
import type { MediaItem } from '@/data/types'

type AssetFilter = 'All' | 'Photography' | 'Video'

const ASSET_FILTERS: AssetFilter[] = ['All', 'Photography', 'Video']

function matchesType(item: MediaItem, filter: AssetFilter): boolean {
  switch (filter) {
    case 'All':
      return true
    case 'Photography':
      return item.type === 'Photography'
    case 'Video':
      return item.type === 'Video'
    default: {
      const unreachable: never = filter
      return unreachable
    }
  }
}

function bannerImage(item: MediaItem | undefined): string {
  if (!item) return ''
  if (item.type === 'Video' || !item.driveFileId) return item.src
  const version = new URL(item.src, 'http://local').searchParams.get('v') ?? '0'
  return `/api/drive/files/${item.driveFileId}/preview?v=${encodeURIComponent(version)}`
}

function slideFor(items: MediaItem[], fileId: string): MediaItem | undefined {
  return items.find((item) => item.driveFileId === fileId || item.id === `drive-${fileId}`)
}

export function CollectionDetailScreen() {
  const params = useParams()
  const { navigate, toast } = useApp()
  const profile = useSession()
  const showroom = isShowroomTheme(profile.interfaceTheme)
  const library = useLibrary()
  const favorites = useFavorites()
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('All')
  const [newestFirst, setNewestFirst] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  const [sharing, setSharing] = useState(false)
  const slug = routeParam(params.slug)
  const collection = slug === FAVORITES_SLUG ? favoritesCollection(library.media, favorites.ids) : library.getCollection(slug)
  if (!collection) {
    return (
      <div className="page collection-detail-page">
        <div className="breadcrumb">
          <button type="button" onClick={() => navigate('/collections', true)}>
            Collections
          </button>
        </div>
        <h1>This collection is not available.</h1>
      </div>
    )
  }
  const items = library.collectionItems(collection)
  const bannerItem =
    collection.cover.map((id) => library.getMedia(id)).find((item): item is MediaItem => item !== null) ?? items[0]
  const bannerSrc = bannerImage(bannerItem)
  const maps = (collection.maps ?? [])
    .map((map) => ({
      description: map.description,
      slides: map.fileIds.map((fileId) => slideFor(items, fileId)).filter((item): item is MediaItem => Boolean(item)),
    }))
    .filter((map) => map.slides.length >= 2)
  const visible = items.filter((item) => matchesType(item, assetFilter))
  const ordered = newestFirst ? visible : [...visible].reverse()

  const collectionId = collection.slug

  async function share() {
    if (sharing) return
    setSharing(true)
    const result = await createCollectionShare(collectionId)
    setSharing(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    const url = `${window.location.origin}/share/${result.token}`
    setShareUrl(url)
    try {
      await navigator.clipboard.writeText(url)
      toast('View-only link copied', 'success')
    } catch {
      toast('Copy the view-only link below')
    }
  }

  const actions = (
    <div className="collection-actions">
      {collection.favorites ? null : (
        <button type="button" className="btn ghost" disabled={sharing} onClick={() => void share()}>
          <Icon name="share" /> {sharing ? 'Creating link' : 'Share collection'}
        </button>
      )}
      <button type="button" className="btn primary" onClick={() => downloadDriveFiles(items)}>
        <Icon name="download" /> Download collection
      </button>
    </div>
  )

  return (
    <div className="page collection-detail-page">
      {showroom ? (
        <section className="showroom-hero">
          {bannerSrc ? <img src={bannerSrc} alt="" /> : null}
          <div className="showroom-hero-fade" />
          <div className="showroom-hero-copy">
            <p>
              Collection
              {collection.date ? ` · ${collection.date}` : ''}
              {collection.published === false ? ' · Draft' : ''}
            </p>
            <h1>{collection.title}</h1>
            {collection.description ? <p className="showroom-hero-note">{collection.description}</p> : null}
            {collection.tags && collection.tags.length > 0 ? (
              <div className="asset-tag-row showroom-hero-tags">
                {collection.tags.map((tag) => (
                  <span key={tag} className="tag">
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
            {actions}
          </div>
        </section>
      ) : (
        <>
          <div className="breadcrumb">
            <button type="button" onClick={() => navigate('/collections', true)}>
              Collections
            </button>
            <span>›</span>
            <b>{collection.title}</b>
          </div>
          <div className="collection-heading">
            <div>
              <div className="eyebrow">Collection</div>
              <h1>
                {collection.title}
                {collection.published === false ? <span className="draft-mark">Draft</span> : null}
              </h1>
              <p>
                {collection.count} assets
                {collection.date ? (
                  <>
                    {' '}
                    <span>·</span> Updated {collection.date}
                  </>
                ) : null}
              </p>
              {collection.description ? <p className="collection-desc">{collection.description}</p> : null}
              {collection.tags && collection.tags.length > 0 ? (
                <div className="asset-tag-row">
                  {collection.tags.map((tag) => (
                    <span key={tag} className="tag">
                      {tag}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
            {actions}
          </div>
        </>
      )}
      {shareUrl ? (
        <label className="share-link">
          <span>View-only link</span>
          <input readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
        </label>
      ) : null}
      <section className="section">
        <div className="section-head">
          {showroom ? null : (
            <div>
              <span className="section-kicker">All assets</span>
              <h2>{collection.title}</h2>
            </div>
          )}
          <div className="inline-controls">
            {ASSET_FILTERS.map((filter) => (
              <button
                key={filter}
                type="button"
                className={assetFilter === filter ? 'pill active' : 'pill'}
                onClick={() => setAssetFilter(filter)}
              >
                {filter === 'All' ? 'All types' : filter}
              </button>
            ))}
            <button type="button" className={newestFirst ? 'pill active' : 'pill'} onClick={() => setNewestFirst(true)}>
              Newest first
            </button>
            <button type="button" className={newestFirst ? 'pill' : 'pill active'} onClick={() => setNewestFirst(false)}>
              Oldest first
            </button>
          </div>
        </div>
        {ordered.length === 0 ? (
          <p className="collection-empty">
            {collection.favorites && assetFilter === 'All' ? 'Star an asset and it will show up here.' : 'No assets match this filter.'}
          </p>
        ) : null}
        <div className="media-grid collection-assets">
          {ordered.map((item, index) => (
            <MediaCard key={`${item.id}-${index}`} item={item} />
          ))}
        </div>
      </section>
      {maps.length > 0 ? (
        <section className="section">
          <div className="section-head">
            <div>
              <span className="section-kicker">Mini content map</span>
              <h2>How this content can run on Instagram</h2>
            </div>
          </div>
          <div className="ig-board">
            {maps.map((map, index) => (
              <InstagramCarousel
                key={`${collection.slug}-map-${index}`}
                title={collection.title}
                description={map.description}
                items={map.slides}
              />
            ))}
          </div>
        </section>
      ) : null}
      <FlowTip
        title="Turn these assets into a social plan. Flow can help with copy, scheduling and publishing."
        linkText="Explore social support"
      />
    </div>
  )
}
