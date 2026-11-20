'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { Icon } from '@/components/icons'
import { cropToFormat, exportFormat } from '@/data/exports'
import type { ServiceName } from '@/lib/requests/services'
import { TutorialImage } from '@/components/guides/TutorialImage'
import { MediaCard } from '@/components/media/MediaCard'
import { streamPath } from '@/lib/drive/prefix-budget'
import { assetFormat, mediaTags, routeParam } from '@/lib/library'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'

const PHOTO_USES: { title: string; note: string; service: ServiceName }[] = [
  { title: 'Posters', note: 'Print it as a poster or a campaign board.', service: 'Design & Branding' },
  { title: 'Merch', note: 'Put it on shirts, totes and other products.', service: 'Design & Branding' },
  { title: 'Packaging', note: 'Use it on packs, labels and sleeves.', service: 'Design & Branding' },
  { title: 'Social posts', note: 'Turn it into posts, covers and stories.', service: 'Social Media' },
  { title: 'Editorial', note: 'Place it in a brochure, report or publication.', service: 'Design & Branding' },
  { title: 'Event branding', note: 'Carry it onto signage and the room itself.', service: 'Design & Branding' },
]

function formatBytes(bytes: number): string {
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function fileType(name: string): string {
  const dot = name.lastIndexOf('.')
  if (dot < 0 || dot === name.length - 1) return 'File'
  return name.slice(dot + 1).toUpperCase()
}

function AssetNotes({ item, tags }: { item: { collection: string; description: string }; tags: string[] }) {
  if (!item.collection && tags.length === 0 && !item.description) return null
  return (
    <div className="asset-photo-notes">
      {item.collection ? (
        <div className="asset-block">
          <h3>Collection</h3>
          <span className="tag collection">{item.collection}</span>
        </div>
      ) : null}
      {tags.length > 0 ? (
        <div className="asset-block">
          <h3>Tags</h3>
          <div className="recommend-pills">
            {tags.map((tag) => (
              <span key={tag}>{tag}</span>
            ))}
          </div>
        </div>
      ) : null}
      {item.description ? (
        <div className="asset-block">
          <h3>Suggested use</h3>
          <p>{item.description}</p>
        </div>
      ) : null}
    </div>
  )
}

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
  const { navigate, openDrawer, setSelectedService, openGuide, toast } = useApp()
  const { media, getMedia } = useLibrary()
  const item = getMedia(routeParam(params.id))
  const [chosen, setChosen] = useState('')
  const [usesOpen, setUsesOpen] = useState(false)
  const [cropUrl, setCropUrl] = useState<string | null>(null)
  const previewSrc = item?.src.includes('/thumbnail') ? item.src.replace('/thumbnail', '/preview') : (item?.src ?? '')
  const selected = item?.type === 'Photography' && (item.exports ?? []).includes(chosen) ? exportFormat(chosen) : null
  const fileVariant = selected ? item?.variants?.[selected.id] : undefined
  const variantSrc = fileVariant ? `/api/drive/files/${fileVariant.fileId}/preview` : ''
  const selectedSize = selected && !fileVariant ? `${selected.width}x${selected.height}` : ''

  useEffect(() => {
    setChosen('')
    setUsesOpen(false)
  }, [item?.id])

  useEffect(() => {
    if (!previewSrc || !selectedSize || variantSrc) return
    const [widthText, heightText] = selectedSize.split('x')
    const width = Number(widthText)
    const height = Number(heightText)
    if (!width || !height) return
    let active = true
    let url = ''
    void cropToFormat(previewSrc, width, height)
      .then((next) => {
        if (!active) {
          URL.revokeObjectURL(next)
          return
        }
        url = next
        setCropUrl(next)
      })
      .catch(() => {
        if (active) setCropUrl(null)
      })
    return () => {
      active = false
      if (url) URL.revokeObjectURL(url)
      setCropUrl(null)
    }
  }, [previewSrc, selectedSize, variantSrc])

  if (!item) {
    return (
      <div className="page asset-page">
        <div className="asset-nav">
          <button type="button" className="text-btn" onClick={() => navigate('/content', true)}>
            ← Back to content
          </button>
        </div>
        <h1>This content is not available.</h1>
      </div>
    )
  }
  const related = media.filter((entry) => entry.id !== item.id).slice(0, 4)
  const tags = mediaTags(item)
  const previous = related[0]
  const next = related[1]
  const guideId = item.type === 'Video' ? 'reels' : 'photos'
  const driveFileId = item.driveFileId
  const driveVideo = item.type === 'Video' && typeof driveFileId === 'string' && driveFileId.length > 0
  const exports = (item.exports ?? []).flatMap((id) => {
    const format = exportFormat(id)
    return format ? [format] : []
  })
  const formatLabel = selected ? `${selected.width} × ${selected.height}` : assetFormat(item.orientation)
  const downloadHref = fileVariant
    ? `/api/drive/files/${fileVariant.fileId}`
    : (cropUrl ?? (item.driveFileId ? `/api/drive/files/${item.driveFileId}` : item.src))
  const downloadName = fileVariant ? fileVariant.name : cropUrl ? `${item.title}.jpg` : item.driveFileId ? item.file : `${item.id}.jpg`
  const shownSrc = variantSrc || cropUrl || previewSrc

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
        <div className="asset-stage">
        <section className={item.type === 'Video' ? 'asset-preview card video' : variantSrc || cropUrl ? 'asset-preview card cropped' : 'asset-preview card'}>
          {driveVideo ? (
            <video
              controls
              playsInline
              preload="auto"
              poster={item.src}
              src={streamPath(item.src, driveFileId)}
              aria-label={item.title}
            />
          ) : (
            <img src={shownSrc} alt={item.title} style={variantSrc || cropUrl ? undefined : { objectPosition: item.position }} />
          )}
          {item.type === 'Video' && !item.driveFileId ? (
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
        {item.type === 'Photography' ? <AssetNotes item={item} tags={tags} /> : null}
        </div>
        <aside className="asset-info">
          <div className="eyebrow">{item.type}</div>
          <h1>{item.title}</h1>
          <p className="asset-sub">
            {item.file} <span>·</span> {item.duration || 'Final'} <span>·</span> {item.orientation}
          </p>
          {item.type === 'Video' ? <AssetNotes item={item} tags={tags} /> : null}
          {exports.length > 0 ? (
            <div className="size-picker" role="radiogroup" aria-label="Photo format">
              <button type="button" role="radio" aria-checked={chosen === ''} className={chosen === '' ? 'on' : ''} onClick={() => setChosen('')}>
                Default
              </button>
              {exports.map((format) => (
                <button
                  key={format.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen === format.id}
                  className={chosen === format.id ? 'on' : ''}
                  onClick={() => setChosen(format.id)}
                >
                  {format.label}
                </button>
              ))}
            </div>
          ) : null}
          {selected ? <p className="size-note">{selected.note}</p> : null}
          <section className="asset-specs">
            <DetailRow label="Format" value={formatLabel} />
            <DetailRow label="File size" value={fileVariant ? formatBytes(fileVariant.bytes) : item.size} />
            <DetailRow label="File type" value={fileVariant ? fileType(fileVariant.name) : cropUrl ? 'JPG' : fileType(item.file)} />
          </section>
          <a className="btn primary wide" href={downloadHref} download={downloadName}>
            <Icon name="download" /> Download
          </a>
          {item.type === 'Photography' ? (
            <div className="photo-uses">
              <button
                type="button"
                className="btn soft wide"
                aria-expanded={usesOpen}
                onClick={() => setUsesOpen((open) => !open)}
              >
                What we can make from this photo
              </button>
              {usesOpen ? (
                <div className="photo-use-list">
                  {PHOTO_USES.map((use) => (
                    <button
                      key={use.title}
                      type="button"
                      onClick={() => {
                        setSelectedService(use.service)
                        openDrawer()
                      }}
                    >
                      <b>{use.title}</b>
                      <span>{use.note}</span>
                    </button>
                  ))}
                </div>
              ) : null}
            </div>
          ) : null}
          <button type="button" className="btn day wide" onClick={() => navigate('/content-day')}>
            Book another Content Day
          </button>
        </aside>
      </div>
      <div className="asset-bottom">
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
