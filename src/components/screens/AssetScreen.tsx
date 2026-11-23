'use client'

import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useParams } from 'next/navigation'
import { Icon } from '@/components/icons'
import { cropToFormat, exportFormat } from '@/data/exports'
import { TutorialImage } from '@/components/guides/TutorialImage'
import { FavoriteButton } from '@/components/media/FavoriteButton'
import { MediaCard } from '@/components/media/MediaCard'
import { submitServiceRequest } from '@/lib/admin/actions'
import { streamPath } from '@/lib/drive/prefix-budget'
import { assetFormat, mediaTags, routeParam } from '@/lib/library'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'

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

function PhotoRequest({ assetFileId, toast }: { assetFileId: string; toast: (message: string, tone?: 'success') => void }) {
  const [message, setMessage] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (sending) return
    setSending(true)
    const result = await submitServiceRequest({
      service: 'Something else',
      message,
      phoneIso: 'PT',
      phoneNumber: '',
      assetFileId,
    })
    setSending(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    setMessage('')
    setSent(true)
    toast('Request sent', 'success')
  }

  return (
    <form className="photo-request" onSubmit={(event) => void onSubmit(event)}>
      <h3>What we can make from this photo</h3>
      <p>Tell us what you want made from this photo.</p>
      <textarea
        value={message}
        maxLength={1000}
        placeholder="A poster, a cover, a print, or anything else you have in mind."
        onChange={(event) => {
          setSent(false)
          setMessage(event.target.value)
        }}
      />
      <button type="submit" className="btn soft wide" disabled={sending || !message.trim()}>
        {sending ? 'Sending' : sent ? 'Sent' : 'Send request'}
      </button>
    </form>
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
  const { navigate, openGuide, toast } = useApp()
  const { media, getMedia } = useLibrary()
  const item = getMedia(routeParam(params.id))
  const [chosen, setChosen] = useState('')
  const [cropUrl, setCropUrl] = useState<string | null>(null)
  const [naturalRatio, setNaturalRatio] = useState<number | null>(null)
  const previewSrc = item?.src.includes('/thumbnail') ? item.src.replace('/thumbnail', '/preview') : (item?.src ?? '')
  const customSelected = item?.customVariants?.find((variant) => variant.id === chosen) ?? null
  const selected = item?.type === 'Photography' && (item.exports ?? []).includes(chosen) ? exportFormat(chosen) : null
  const fileVariant = selected ? item?.variants?.[selected.id] : (customSelected ?? undefined)
  const variantSrc = fileVariant ? `/api/drive/files/${fileVariant.fileId}/preview` : ''
  const selectedSize = selected && !fileVariant ? `${selected.width}x${selected.height}` : ''

  useEffect(() => {
    setChosen('')
  }, [item?.id])

  useEffect(() => {
    setNaturalRatio(null)
  }, [previewSrc, variantSrc, cropUrl])

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
  const customVariants = item.customVariants ?? []
  const formatRatio = selected
    ? selected.width / selected.height
    : customSelected?.width && customSelected.height
      ? customSelected.width / customSelected.height
      : naturalRatio
  const shaped = item.type === 'Photography' && chosen !== '' && Boolean(formatRatio)
  const formatLabel = selected
    ? `${selected.width} × ${selected.height}`
    : customSelected?.width && customSelected.height
      ? `${customSelected.label} · ${customSelected.width} × ${customSelected.height}`
      : customSelected
        ? customSelected.label
        : assetFormat(item.orientation)
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
        <section
          className={item.type === 'Video' ? 'asset-preview card video' : shaped ? 'asset-preview card shaped' : 'asset-preview card'}
          style={shaped && formatRatio ? { ['--frame-ratio' as string]: String(formatRatio) } : undefined}
        >
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
            <img
              src={shownSrc}
              alt={item.title}
              style={shaped || variantSrc || cropUrl ? undefined : { objectPosition: item.position }}
              onLoad={(event) => {
                const image = event.currentTarget
                if (image.naturalWidth > 0 && image.naturalHeight > 0) setNaturalRatio(image.naturalWidth / image.naturalHeight)
              }}
            />
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
          <div className="asset-title-line">
            <h1>{item.title}</h1>
            {item.driveFileId ? <FavoriteButton fileId={item.driveFileId} placement="inline" /> : null}
          </div>
          <p className="asset-sub">
            {item.file} <span>·</span> {item.duration || 'Final'} <span>·</span> {item.orientation}
          </p>
          {item.type === 'Video' ? <AssetNotes item={item} tags={tags} /> : null}
          {exports.length > 0 || customVariants.length > 0 ? (
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
              {customVariants.map((variant) => (
                <button
                  key={variant.id}
                  type="button"
                  role="radio"
                  aria-checked={chosen === variant.id}
                  className={chosen === variant.id ? 'on' : ''}
                  onClick={() => setChosen(variant.id)}
                >
                  {variant.label}
                </button>
              ))}
            </div>
          ) : null}
          {selected ? <p className="size-note">{selected.note}</p> : null}
          {customSelected ? <p className="size-note">This file keeps the size of the photo that was uploaded.</p> : null}
          <section className="asset-specs">
            <DetailRow label="Format" value={formatLabel} />
            <DetailRow label="File size" value={fileVariant ? formatBytes(fileVariant.bytes) : item.size} />
            <DetailRow label="File type" value={fileVariant ? fileType(fileVariant.name) : cropUrl ? 'JPG' : fileType(item.file)} />
          </section>
          <a className="btn primary wide" href={downloadHref} download={downloadName}>
            <Icon name="download" /> Download
          </a>
          {item.type === 'Photography' ? <PhotoRequest assetFileId={item.driveFileId ?? ''} toast={toast} /> : null}
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
