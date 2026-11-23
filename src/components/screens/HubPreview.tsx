'use client'

import { useMemo, useState } from 'react'

type PreviewKind = 'Photography' | 'Video'

type PreviewItem = {
  id: string
  title: string
  kind: PreviewKind
  collection: string
  src: string
  size: string
}

type PreviewView = 'library' | 'collections'

const ITEMS: PreviewItem[] = [
  { id: 'photo-1', title: 'Photo #1', kind: 'Photography', collection: 'Summer shoot', src: '/assets/guide_photos/recording_one.jpg', size: '4.2 MB' },
  { id: 'photo-2', title: 'Photo #2', kind: 'Photography', collection: 'Summer shoot', src: '/assets/guide_photos/recording_two.jpg', size: '3.8 MB' },
  { id: 'photo-3', title: 'Photo #3', kind: 'Photography', collection: 'Brand day', src: '/assets/guide_photos/drone_recording.jpg', size: '5.1 MB' },
  { id: 'reel-1', title: 'Reel #1', kind: 'Video', collection: 'Brand day', src: '/assets/tutorials/reels.png', size: '18 MB' },
  { id: 'photo-4', title: 'Photo #4', kind: 'Photography', collection: 'Event', src: '/assets/tutorials/photos.png', size: '2.4 MB' },
  { id: 'photo-5', title: 'Photo #5', kind: 'Photography', collection: 'Event', src: '/assets/tutorials/filters.png', size: '2.9 MB' },
]

export function HubPreview() {
  const [view, setView] = useState<PreviewView>('library')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<'All' | PreviewKind>('All')
  const [collection, setCollection] = useState('')
  const [openId, setOpenId] = useState('')
  const [notice, setNotice] = useState('')
  const open = ITEMS.find((item) => item.id === openId) ?? null
  const collections = useMemo(() => {
    const names = [...new Set(ITEMS.map((item) => item.collection))]
    return names.map((name) => ({
      name,
      count: ITEMS.filter((item) => item.collection === name).length,
      cover: ITEMS.find((item) => item.collection === name)?.src ?? '',
    }))
  }, [])
  const visible = ITEMS.filter((item) => {
    if (kind !== 'All' && item.kind !== kind) return false
    if (collection && item.collection !== collection) return false
    const text = query.trim().toLowerCase()
    if (!text) return true
    return item.title.toLowerCase().includes(text) || item.collection.toLowerCase().includes(text)
  })

  function openLibrary(nextCollection = '') {
    setCollection(nextCollection)
    setOpenId('')
    setNotice('')
    setView('library')
  }

  return (
    <div className="hub-preview">
      <nav className="hub-rail" aria-label="Preview navigation">
        <span>Content Hub</span>
        <button type="button" className={view === 'library' && !open ? 'on' : ''} onClick={() => openLibrary(collection)}>
          Content
        </button>
        <button
          type="button"
          className={view === 'collections' ? 'on' : ''}
          onClick={() => {
            setOpenId('')
            setNotice('')
            setView('collections')
          }}
        >
          Collections
        </button>
      </nav>
      <div className="hub-main">
        {open ? (
          <article className="hub-detail">
            <img src={open.src} alt={open.title} />
            <aside>
              <button type="button" className="hub-back" onClick={() => setOpenId('')}>
                Back
              </button>
              <h3>{open.title}</h3>
              <p>{open.collection}</p>
              <dl>
                <div>
                  <dt>Format</dt>
                  <dd>{open.kind}</dd>
                </div>
                <div>
                  <dt>File size</dt>
                  <dd>{open.size}</dd>
                </div>
              </dl>
              <button type="button" className="hub-download" onClick={() => setNotice('Downloads open after you sign in.')}>
                Download
              </button>
              {notice ? <small>{notice}</small> : null}
            </aside>
          </article>
        ) : (
          <PreviewBody
            view={view}
            query={query}
            kind={kind}
            collection={collection}
            visible={visible}
            collections={collections}
            onQuery={setQuery}
            onKind={setKind}
            onClearCollection={() => setCollection('')}
            onOpen={setOpenId}
            onOpenCollection={(name) => openLibrary(name)}
          />
        )}
      </div>
    </div>
  )
}

function PreviewBody({
  view,
  query,
  kind,
  collection,
  visible,
  collections,
  onQuery,
  onKind,
  onClearCollection,
  onOpen,
  onOpenCollection,
}: {
  view: PreviewView
  query: string
  kind: 'All' | PreviewKind
  collection: string
  visible: PreviewItem[]
  collections: { name: string; count: number; cover: string }[]
  onQuery: (value: string) => void
  onKind: (value: 'All' | PreviewKind) => void
  onClearCollection: () => void
  onOpen: (id: string) => void
  onOpenCollection: (name: string) => void
}) {
  switch (view) {
    case 'library':
      return (
        <>
          <div className="hub-tools">
            <input value={query} placeholder="Search" aria-label="Search the preview" onChange={(event) => onQuery(event.target.value)} />
            {(['All', 'Photography', 'Video'] as const).map((option) => (
              <button key={option} type="button" className={kind === option ? 'on' : ''} onClick={() => onKind(option)}>
                {option}
              </button>
            ))}
          </div>
          {collection ? (
            <button type="button" className="hub-filter" onClick={onClearCollection}>
              {collection} · clear
            </button>
          ) : null}
          <div className="hub-grid">
            {visible.map((item) => (
              <button key={item.id} type="button" className="hub-card" onClick={() => onOpen(item.id)}>
                <img src={item.src} alt={item.title} />
                <span>{item.title}</span>
                <small>{item.kind}</small>
              </button>
            ))}
            {visible.length === 0 ? <p className="hub-empty">Nothing matches that search.</p> : null}
          </div>
        </>
      )
    case 'collections':
      return (
        <div className="hub-grid">
          {collections.map((item) => (
            <button key={item.name} type="button" className="hub-card" onClick={() => onOpenCollection(item.name)}>
              <img src={item.cover} alt={item.name} />
              <span>{item.name}</span>
              <small>{item.count} files</small>
            </button>
          ))}
        </div>
      )
    default: {
      const unreachable: never = view
      return unreachable
    }
  }
}
