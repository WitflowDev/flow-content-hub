'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { useParams } from 'next/navigation'
import { Icon } from '@/components/icons'
import { InstagramCarousel } from '@/components/collections/InstagramCarousel'
import { FlowTip } from '@/components/feedback/FlowTip'
import { MediaCard } from '@/components/media/MediaCard'
import { downloadDriveFiles } from '@/lib/downloadDriveFiles'
import { ShareQr } from '@/components/share/ShareQr'
import { createCollectionShare } from '@/lib/share/actions'
import { parseShareDays, shareLifetimeLabel } from '@/lib/share/policy'
import { FAVORITES_SLUG, favoritesCollection } from '@/lib/favorites'
import type { InterfaceTheme } from '@/lib/interface-theme'
import { routeParam } from '@/lib/library'
import { useProgressiveCount } from '@/lib/useProgressiveCount'
import { useFavorites } from '@/state/Favorites'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'
import { useSession } from '@/state/Session'
import type { MediaItem } from '@/data/types'

type AssetFilter = 'All' | 'Photography' | 'Video'

const ASSET_FILTERS: AssetFilter[] = ['All', 'Photography', 'Video']
const SHARE_CHOICES = ['3', '7', '14', '31', 'custom'] as const

type ShareChoice = (typeof SHARE_CHOICES)[number]

function isShareChoice(value: string): value is ShareChoice {
  return (SHARE_CHOICES as readonly string[]).includes(value)
}

function chosenShareDays(choice: ShareChoice, custom: string): number | null {
  switch (choice) {
    case '3':
    case '7':
    case '14':
    case '31':
      return parseShareDays(Number(choice))
    case 'custom':
      return parseShareDays(Number(custom))
    default: {
      const unexpected: never = choice
      return unexpected
    }
  }
}

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
  const library = useLibrary()
  const favorites = useFavorites()
  const [assetFilter, setAssetFilter] = useState<AssetFilter>('All')
  const [newestFirst, setNewestFirst] = useState(true)
  const [shareUrl, setShareUrl] = useState('')
  const [sharing, setSharing] = useState(false)
  const [shareChoice, setShareChoice] = useState<ShareChoice>('7')
  const [customDays, setCustomDays] = useState('10')
  const slug = routeParam(params.slug)

  useEffect(() => {
    setAssetFilter('All')
    setNewestFirst(true)
    setShareUrl('')
  }, [slug])

  const collection = slug === FAVORITES_SLUG ? favoritesCollection(library.media, favorites.ids) : library.getCollection(slug)
  const items = collection ? library.collectionItems(collection) : []
  const visible = items.filter((item) => matchesType(item, assetFilter))
  const ordered = newestFirst ? visible : [...visible].reverse()
  const { shown, hasMore, sentinelRef, showMore } = useProgressiveCount(
    ordered.length,
    `${slug}|${assetFilter}|${newestFirst}`,
  )
  const visibleOrdered = ordered.slice(0, shown)
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
  const bannerItem =
    collection.cover.map((id) => library.getMedia(id)).find((item): item is MediaItem => item !== null) ?? items[0]
  const bannerSrc = bannerImage(bannerItem)
  const maps = (collection.maps ?? [])
    .map((map) => ({
      description: map.description,
      slides: map.fileIds.map((fileId) => slideFor(items, fileId)).filter((item): item is MediaItem => Boolean(item)),
    }))
    .filter((map) => map.slides.length >= 2)

  const collectionId = collection.slug

  async function share() {
    if (sharing) return
    const days = chosenShareDays(shareChoice, customDays)
    if (days === null) {
      toast('Choose a link lifetime between 1 and 62 days.')
      return
    }
    setSharing(true)
    const result = await createCollectionShare(collectionId, days)
    setSharing(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    const url = `${window.location.origin}/share/${result.token}`
    const lifetime = shareLifetimeLabel(days)
    setShareUrl(url)
    try {
      if (!navigator.clipboard?.writeText) throw new Error('clipboard unavailable')
      await navigator.clipboard.writeText(url)
      toast(`View-only link copied. It expires in ${lifetime}.`, 'success')
    } catch {
      toast(`Copy the view-only link below. It expires in ${lifetime}.`)
    }
  }

  const actions = (
    <div className="collection-actions">
      {collection.favorites ? null : (
        <div className="share-controls">
          <label>
            <span>Link expires</span>
            <select
              value={shareChoice}
              onChange={(event) => {
                if (isShareChoice(event.currentTarget.value)) setShareChoice(event.currentTarget.value)
              }}
            >
              {SHARE_CHOICES.map((choice) => (
                <option key={choice} value={choice}>
                  {choice === 'custom' ? 'Custom' : `${choice} days`}
                </option>
              ))}
            </select>
          </label>
          {shareChoice === 'custom' ? (
            <label>
              <span>Days</span>
              <input
                type="number"
                min={1}
                max={62}
                step={1}
                inputMode="numeric"
                value={customDays}
                onChange={(event) => setCustomDays(event.currentTarget.value)}
              />
            </label>
          ) : null}
          <button
            type="button"
            className="btn ghost"
            disabled={sharing || chosenShareDays(shareChoice, customDays) === null}
            onClick={() => void share()}
          >
            <Icon name="share" /> {sharing ? 'Creating link' : 'Share collection'}
          </button>
        </div>
      )}
      <button
        type="button"
        className="btn primary"
        disabled={items.length === 0}
        onClick={() => downloadDriveFiles(items, toast, collection.title)}
      >
        <Icon name="download" /> Download collection
      </button>
    </div>
  )

  return (
    <div className="page collection-detail-page">
      <CollectionLead
        theme={profile.interfaceTheme}
        title={collection.title}
        date={collection.date}
        count={collection.count}
        description={collection.description}
        tags={collection.tags}
        draft={collection.published === false}
        bannerSrc={bannerSrc}
        actions={actions}
        onBack={() => navigate('/collections', true)}
      />
      {shareUrl ? (
        <div className="share-link">
          <label>
            <span>View-only link</span>
            <input readOnly value={shareUrl} onFocus={(event) => event.currentTarget.select()} />
          </label>
          <ShareQr url={shareUrl} />
        </div>
      ) : null}
      <section className="section">
        <div className="section-head">
          {showsAssetHeading(profile.interfaceTheme) ? (
            <div>
              <span className="section-kicker">All assets</span>
              <h2>{collection.title}</h2>
            </div>
          ) : null}
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
          {visibleOrdered.map((item, index) => (
            <MediaCard key={item.id} item={item} eager={index < 4} />
          ))}
        </div>
        {hasMore ? (
          <div ref={sentinelRef} className="collection-empty">
            <button type="button" className="btn ghost" onClick={showMore}>
              Load more ({ordered.length - shown} remaining)
            </button>
          </div>
        ) : null}
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

function showsAssetHeading(theme: InterfaceTheme): boolean {
  switch (theme) {
    case 'studio':
      return true
    case 'showroom':
    case 'minimalist':
    case 'high-tech':
    case 'institutional':
      return false
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}

function CollectionLead({
  theme,
  title,
  date,
  count,
  description,
  tags,
  draft,
  bannerSrc,
  actions,
  onBack,
}: {
  theme: InterfaceTheme
  title: string
  date?: string
  count: number
  description?: string
  tags?: string[]
  draft: boolean
  bannerSrc: string
  actions: ReactNode
  onBack: () => void
}) {
  const tagRow =
    tags && tags.length > 0 ? (
      <div className="asset-tag-row showroom-hero-tags">
        {tags.map((tag) => (
          <span key={tag} className="tag">
            {tag}
          </span>
        ))}
      </div>
    ) : null

  switch (theme) {
    case 'showroom':
      return (
        <section className="showroom-hero">
          {bannerSrc ? <img src={bannerSrc} alt="" /> : null}
          <div className="showroom-hero-fade" />
          <div className="showroom-hero-copy">
            <p>
              Collection
              {date ? ` · ${date}` : ''}
              {draft ? ' · Draft' : ''}
            </p>
            <h1>{title}</h1>
            {description ? <p className="showroom-hero-note">{description}</p> : null}
            {tagRow}
            {actions}
          </div>
        </section>
      )
    case 'high-tech':
      return (
        <section className="tech-hero">
          <div>
            <p>
              Collection
              {date ? ` / ${date}` : ''}
              {draft ? ' / Draft' : ''}
            </p>
            <h1>{title}</h1>
            <p className="tech-hero-note">{count} assets</p>
            {description ? <p className="tech-hero-note">{description}</p> : null}
            {tagRow}
          </div>
          {actions}
        </section>
      )
    case 'institutional':
      return (
        <section className="civic-hero">
          <div>
            <p>
              Collection
              {date ? ` · ${date}` : ''}
              {draft ? ' · Draft' : ''}
            </p>
            <h1>{title}</h1>
            <p className="civic-hero-note">{count} assets</p>
            {description ? <p className="civic-hero-note">{description}</p> : null}
            {tagRow}
          </div>
          {actions}
        </section>
      )
    case 'minimalist':
      return (
        <section className="minimal-hero">
          <p>
            Collection
            {date ? ` / ${date}` : ''}
            {draft ? ' / Draft' : ''}
          </p>
          <h1>{title}</h1>
          <div className="minimal-rule" />
          <p className="minimal-meta">{count} assets</p>
          {description ? <p className="minimal-note">{description}</p> : null}
          {tagRow}
          {actions}
        </section>
      )
    case 'studio':
      return (
        <>
          <div className="breadcrumb">
            <button type="button" onClick={onBack}>
              Collections
            </button>
            <span>›</span>
            <b>{title}</b>
          </div>
          <div className="collection-heading">
            <div>
              <div className="eyebrow">Collection</div>
              <h1>
                {title}
                {draft ? <span className="draft-mark">Draft</span> : null}
              </h1>
              <p>
                {count} assets
                {date ? (
                  <>
                    {' '}
                    <span>·</span> Updated {date}
                  </>
                ) : null}
              </p>
              {description ? <p className="collection-desc">{description}</p> : null}
              {tagRow}
            </div>
            {actions}
          </div>
        </>
      )
    default: {
      const unexpected: never = theme
      return unexpected
    }
  }
}
