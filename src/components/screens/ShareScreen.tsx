'use client'

import { useState } from 'react'
import { InstagramCarousel } from '@/components/collections/InstagramCarousel'
import { Logo } from '@/components/shell/Logo'
import { VideoStill } from '@/components/media/VideoStill'
import type { MediaItem } from '@/data/types'
import type { SharedCollectionView, SharedFile } from '@/lib/share/types'

export function ShareScreen({ token, collection }: { token: string; collection: SharedCollectionView }) {
  const [openId, setOpenId] = useState<string | null>(null)
  const openIndex = collection.files.findIndex((file) => file.id === openId)
  const open = openIndex >= 0 ? collection.files[openIndex] : null
  const maps = collection.maps
    .map((map) => ({
      description: map.description,
      slides: map.fileIds.map((id) => collection.files.find((file) => file.id === id)).filter((file): file is SharedFile => Boolean(file)),
    }))
    .filter((map) => map.slides.length >= 2)

  return (
    <div className="share-shell">
      <header className="share-bar">
        <Logo />
      </header>
      <main className="page">
        <div className="collection-heading">
          <div>
            <div className="eyebrow">Shared collection</div>
            <h1>{collection.title}</h1>
            <p>
              {collection.files.length} assets{collection.date ? <span> · Updated {collection.date}</span> : null}
            </p>
            {collection.description ? <p className="collection-desc">{collection.description}</p> : null}
            <p className="share-note">View and download only. This link does not open the rest of the library.</p>
          </div>
          <div className="collection-actions">
            <button type="button" className="btn primary" onClick={() => downloadFiles(token, collection.files)}>
              Download collection
            </button>
          </div>
        </div>
        {collection.files.length === 0 ? <p className="collection-empty">This collection has no files yet.</p> : null}
        <div className="media-grid">
          {collection.files.map((file) => (
            <button key={file.id} type="button" className="media-card share-card" onClick={() => setOpenId(file.id)}>
              <span className="thumb">
                {file.type === 'Video' ? (
                  <VideoStill src={fileUrl(token, file.id, 'stream')} alt="" />
                ) : (
                  <img src={fileUrl(token, file.id, 'thumbnail')} alt="" />
                )}
              </span>
              <span className="media-card-title">{file.title}</span>
            </button>
          ))}
        </div>
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
                  key={`${collection.title}-map-${index}`}
                  title={collection.title}
                  description={map.description}
                  items={map.slides.map((file) => toMedia(file, token))}
                  videoSrc={shareVideo}
                />
              ))}
            </div>
          </section>
        ) : null}
      </main>
      {open ? (
        <div className="share-viewer" role="dialog" aria-modal="true">
          <div className="card share-viewer-card">
            <div className="share-viewer-head">
              <b>{open.title}</b>
              <button type="button" className="btn ghost" onClick={() => setOpenId(null)}>
                Close
              </button>
            </div>
            {open.type === 'Video' ? (
              <video controls playsInline preload="metadata" src={fileUrl(token, open.id, 'stream')} />
            ) : (
              <img src={fileUrl(token, open.id, 'preview')} alt={open.title} />
            )}
            {open.description ? <p className="share-caption">{open.description}</p> : null}
            <div className="share-viewer-actions">
              <button
                type="button"
                className="btn ghost"
                disabled={openIndex <= 0}
                onClick={() => {
                  const previous = collection.files[openIndex - 1]
                  if (previous) setOpenId(previous.id)
                }}
              >
                Previous
              </button>
              <button type="button" className="btn primary" onClick={() => downloadFiles(token, [open])}>
                Download
              </button>
              <button
                type="button"
                className="btn ghost"
                disabled={openIndex >= collection.files.length - 1}
                onClick={() => {
                  const next = collection.files[openIndex + 1]
                  if (next) setOpenId(next.id)
                }}
              >
                Next
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

function shareVideo(item: MediaItem): string | undefined {
  return item.driveFileId ? fileUrl(item.collection, item.driveFileId, 'stream') : undefined
}

function toMedia(file: SharedFile, token: string): MediaItem {
  return {
    id: file.id,
    title: file.title,
    type: file.type,
    file: file.fileName,
    size: '',
    src: fileUrl(token, file.id, 'thumbnail'),
    channel: '',
    orientation: 'Square',
    collection: token,
    position: '50% 50%',
    description: file.description,
    driveFileId: file.id,
  }
}

function fileUrl(token: string, fileId: string, kind: 'thumbnail' | 'preview' | 'stream' | 'file'): string {
  const base = `/api/share/${token}/files/${fileId}`
  if (kind === 'file') return base
  return `${base}/${kind}`
}

function downloadFiles(token: string, files: readonly SharedFile[]) {
  for (const file of files) {
    const link = document.createElement('a')
    link.href = fileUrl(token, file.id, 'file')
    link.download = file.fileName
    document.body.appendChild(link)
    link.click()
    link.remove()
  }
}
