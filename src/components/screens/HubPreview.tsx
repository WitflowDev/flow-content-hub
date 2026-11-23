'use client'

import { useMemo, useState } from 'react'
import { Icon, type IconName } from '@/components/icons'
import { Logo } from '@/components/shell/Logo'
import { guides } from '@/data/guides'

type PreviewKind = 'Photography' | 'Video'
type PreviewFormat = 'Post' | 'Story' | 'Banner'
type KindFilter = 'All' | PreviewKind | 'Design'
type HubView = 'home' | 'content' | 'collections' | 'guides' | 'day'
type SortMode = 'Newest' | 'A–Z'
type Board = 'grid' | 'list'

type PreviewItem = {
  id: string
  title: string
  file: string
  kind: PreviewKind
  collection: string
  tags: string[]
  src: string
  video?: string
  size: string
  fileType: string
  orientation: string
  duration?: string
  use: string
  formats: PreviewFormat[]
  position: string
}

const FORMAT_RATIO: Record<PreviewFormat, number> = {
  Post: 1080 / 1350,
  Story: 1080 / 1920,
  Banner: 1640 / 624,
}

const NAV: Array<{ id: HubView; label: string; icon: IconName }> = [
  { id: 'home', label: 'Home', icon: 'home' },
  { id: 'content', label: 'My Content', icon: 'folder' },
  { id: 'collections', label: 'Collections', icon: 'layers' },
  { id: 'guides', label: 'Guides', icon: 'book' },
  { id: 'day', label: 'Content Day', icon: 'calendar' },
]

const KINDS: KindFilter[] = ['All', 'Photography', 'Video', 'Design']
const SHOWN_GUIDES = guides.slice(0, 3)

const ITEMS: PreviewItem[] = [
  {
    id: 'reel',
    title: 'Brand reel',
    file: 'brand-reel.mp4',
    kind: 'Video',
    collection: 'Brand day',
    tags: ['Social', 'Reel'],
    src: '/assets/guide_photos/presentation_one.jpg',
    video: '/assets/mock_videos/reel_explainer.mp4',
    size: '24.8 MB',
    fileType: 'MP4',
    orientation: 'Vertical',
    duration: '00:42',
    use: 'Lead with this on Instagram and keep the logo in the last frame.',
    formats: [],
    position: 'center',
  },
  {
    id: 'presentation',
    title: 'Brand presentation',
    file: 'brand-presentation.jpg',
    kind: 'Photography',
    collection: 'Launch',
    tags: ['Event', 'Stage'],
    src: '/assets/guide_photos/presentation_one.jpg',
    size: '6.4 MB',
    fileType: 'JPG',
    orientation: 'Landscape',
    use: 'A wide cover for the talk recap and the event page.',
    formats: ['Banner', 'Post'],
    position: 'center 40%',
  },
  {
    id: 'street',
    title: 'Street interview',
    file: 'street-interview.jpg',
    kind: 'Photography',
    collection: 'Launch',
    tags: ['People', 'Interview'],
    src: '/assets/guide_photos/camera_outside_one.jpg',
    size: '4.8 MB',
    fileType: 'JPG',
    orientation: 'Landscape',
    use: 'Best as a story when the guest is speaking.',
    formats: ['Story', 'Post'],
    position: 'center',
  },
  {
    id: 'aerial',
    title: 'Aerial',
    file: 'aerial.jpg',
    kind: 'Photography',
    collection: 'Brand day',
    tags: ['Place', 'Drone'],
    src: '/assets/guide_photos/drone_recording.jpg',
    size: '8.1 MB',
    fileType: 'JPG',
    orientation: 'Landscape',
    use: 'Use the wide frame as a cover or a website banner.',
    formats: ['Banner', 'Post'],
    position: 'center',
  },
  {
    id: 'onset',
    title: 'On set',
    file: 'on-set.jpg',
    kind: 'Photography',
    collection: 'Summer shoot',
    tags: ['Behind the scenes'],
    src: '/assets/guide_photos/recording_one.jpg',
    size: '5.2 MB',
    fileType: 'JPG',
    orientation: 'Landscape',
    use: 'A feed post that shows the team at work.',
    formats: ['Post', 'Story'],
    position: 'center',
  },
  {
    id: 'interview',
    title: 'Close interview',
    file: 'close-interview.jpg',
    kind: 'Photography',
    collection: 'Summer shoot',
    tags: ['People', 'Interview'],
    src: '/assets/guide_photos/recording_two.jpg',
    size: '4.1 MB',
    fileType: 'JPG',
    orientation: 'Landscape',
    use: 'Crop tight for a story. The wide frame still works as a post.',
    formats: ['Post', 'Story', 'Banner'],
    position: 'center 30%',
  },
  {
    id: 'workshop',
    title: 'Workshop',
    file: 'workshop.jpg',
    kind: 'Photography',
    collection: 'Summer shoot',
    tags: ['Team'],
    src: '/assets/guide_photos/talk_one.jpg',
    size: '3.6 MB',
    fileType: 'JPG',
    orientation: 'Landscape',
    use: 'Good for a recap post after the session.',
    formats: ['Post'],
    position: 'center',
  },
  {
    id: 'studio',
    title: 'Studio setup',
    file: 'studio-setup.jpg',
    kind: 'Photography',
    collection: 'Summer shoot',
    tags: ['Behind the scenes'],
    src: '/assets/guide_photos/camera_one.jpg',
    size: '4.4 MB',
    fileType: 'JPG',
    orientation: 'Landscape',
    use: 'A vertical crop keeps the camera in frame.',
    formats: ['Story', 'Post'],
    position: 'center',
  },
  {
    id: 'edit',
    title: 'Edit session',
    file: 'edit-session.jpg',
    kind: 'Photography',
    collection: 'Brand day',
    tags: ['Process'],
    src: '/assets/guide_photos/on_computer_desk.jpg',
    size: '3.9 MB',
    fileType: 'JPG',
    orientation: 'Landscape',
    use: 'A quiet post for the making-of sequence.',
    formats: ['Post'],
    position: 'center',
  },
  {
    id: 'angle',
    title: 'Second angle',
    file: 'second-angle.jpg',
    kind: 'Photography',
    collection: 'Brand day',
    tags: ['Behind the scenes'],
    src: '/assets/guide_photos/camera_two.jpg',
    size: '4.6 MB',
    fileType: 'JPG',
    orientation: 'Landscape',
    use: 'Pair it with the main interview in the same collection.',
    formats: ['Post', 'Story'],
    position: 'center',
  },
]

function sortItems(items: PreviewItem[], mode: SortMode): PreviewItem[] {
  switch (mode) {
    case 'Newest':
      return items
    case 'A–Z':
      return [...items].sort((left, right) => left.title.localeCompare(right.title))
    default: {
      const unreachable: never = mode
      return unreachable
    }
  }
}

export function HubPreview() {
  const [view, setView] = useState<HubView>('home')
  const [query, setQuery] = useState('')
  const [kind, setKind] = useState<KindFilter>('All')
  const [collection, setCollection] = useState('')
  const [sort, setSort] = useState<SortMode>('Newest')
  const [board, setBoard] = useState<Board>('grid')
  const [openId, setOpenId] = useState('')
  const [format, setFormat] = useState<'' | PreviewFormat>('')
  const [guideId, setGuideId] = useState('')
  const [notice, setNotice] = useState('')
  const [menuOpen, setMenuOpen] = useState(false)
  const open = ITEMS.find((item) => item.id === openId) ?? null
  const guide = SHOWN_GUIDES.find((item) => item.id === guideId) ?? null
  const collections = useMemo(() => {
    const names = [...new Set(ITEMS.map((item) => item.collection))]
    return names.map((name) => {
      const files = ITEMS.filter((item) => item.collection === name)
      return { name, count: files.length, covers: files.slice(0, 4).map((item) => item.src) }
    })
  }, [])
  const visible = sortItems(
    ITEMS.filter((item) => {
      if (kind !== 'All' && item.kind !== kind) return false
      if (collection && item.collection !== collection) return false
      const text = query.trim().toLowerCase()
      if (!text) return true
      return [item.title, item.collection, item.file, ...item.tags].join(' ').toLowerCase().includes(text)
    }),
    sort,
  )

  function go(next: HubView) {
    setView(next)
    setOpenId('')
    setGuideId('')
    setNotice('')
    setMenuOpen(false)
    if (next !== 'content') setCollection('')
  }

  function openAsset(id: string) {
    setOpenId(id)
    setFormat('')
    setGuideId('')
    setNotice('')
  }

  function openCollection(name: string) {
    setCollection(name)
    setKind('All')
    setQuery('')
    setOpenId('')
    setGuideId('')
    setNotice('')
    setView('content')
    setMenuOpen(false)
  }

  return (
    <div className={menuOpen ? 'hub-preview menu-open' : 'hub-preview'}>
      <button type="button" className="hub-scrim" aria-label="Close menu" onClick={() => setMenuOpen(false)} />
      <aside className="hub-rail">
        <button type="button" className="hub-brand" onClick={() => go('home')} aria-label="Home">
          <Logo />
        </button>
        <nav className="hub-nav" aria-label="Preview navigation">
          {NAV.map((item) => (
            <button key={item.id} type="button" className={view === item.id && !open && !guide ? 'on' : ''} onClick={() => go(item.id)}>
              <Icon name={item.icon} />
              <span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="hub-talk">
          <p>Have a project in mind?</p>
          <a href="https://www.flowproductions.pt/en/contactos" target="_blank" rel="noreferrer">
            Talk to us
          </a>
        </div>
      </aside>
      <div className="hub-stage">
        <div className="hub-top">
          <button
            type="button"
            className="hub-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
          >
            ☰
          </button>
          <form
            onSubmit={(event) => {
              event.preventDefault()
              setView('content')
              setOpenId('')
              setGuideId('')
            }}
          >
            <Icon name="search" />
            <input
              value={query}
              placeholder="Search by title, collection or tag"
              aria-label="Search the preview"
              onChange={(event) => {
                setQuery(event.target.value)
                setOpenId('')
                setGuideId('')
                if (event.target.value.trim()) setView('content')
              }}
            />
          </form>
          <button type="button" className="hub-icon" aria-label="Notifications" onClick={() => setNotice('Notifications open after you sign in.')}>
            <Icon name="bell" />
          </button>
          <span className="hub-avatar" aria-hidden="true">
            A
          </span>
        </div>
        <div className="hub-page">
          {open ? (
            <AssetPreview item={open} format={format} notice={notice} onFormat={setFormat} onBack={() => setOpenId('')} onNotice={setNotice} />
          ) : guide ? (
            <GuidePreview
              title={guide.title}
              text={guide.desc}
              poster={guide.poster}
              steps={guide.steps}
              onBack={() => setGuideId('')}
            />
          ) : (
            <HubPage
              view={view}
              query={query}
              kind={kind}
              collection={collection}
              sort={sort}
              board={board}
              visible={visible}
              collections={collections}
              notice={notice}
              onKind={setKind}
              onSort={setSort}
              onBoard={setBoard}
              onClearCollection={() => setCollection('')}
              onOpen={openAsset}
              onOpenCollection={openCollection}
              onGuide={setGuideId}
              onGo={go}
            />
          )}
        </div>
      </div>
    </div>
  )
}

function HubPage({
  view,
  query,
  kind,
  collection,
  sort,
  board,
  visible,
  collections,
  notice,
  onKind,
  onSort,
  onBoard,
  onClearCollection,
  onOpen,
  onOpenCollection,
  onGuide,
  onGo,
}: {
  view: HubView
  query: string
  kind: KindFilter
  collection: string
  sort: SortMode
  board: Board
  visible: PreviewItem[]
  collections: { name: string; count: number; covers: string[] }[]
  notice: string
  onKind: (value: KindFilter) => void
  onSort: (value: SortMode) => void
  onBoard: (value: Board) => void
  onClearCollection: () => void
  onOpen: (id: string) => void
  onOpenCollection: (name: string) => void
  onGuide: (id: string) => void
  onGo: (view: HubView) => void
}) {
  switch (view) {
    case 'home':
      return (
        <>
          <p className="hub-kicker">Flow Content Hub</p>
          <h2>Good morning.</h2>
          <p className="hub-lead">Everything your brand has created with Flow, ready to use.</p>
          <button type="button" className="hub-offer" onClick={() => onGo('day')}>
            <span>Content Day</span>
            <b>One production day. Delivered here.</b>
          </button>
          <div className="hub-section-head">
            <div>
              <span>Latest content</span>
              <strong>Recently added</strong>
            </div>
            <button type="button" onClick={() => onGo('content')}>
              View all
            </button>
          </div>
          <ItemBoard items={ITEMS.slice(0, 4)} board="grid" onOpen={onOpen} />
          {collections[0] ? (
            <button type="button" className="hub-feature" onClick={() => onOpenCollection(collections[0].name)}>
              <span className="hub-stack">
                {ITEMS.filter((item) => item.collection === collections[0].name)
                  .slice(0, 3)
                  .map((item) => (
                    <img key={item.id} src={item.src} alt="" />
                  ))}
              </span>
              <span>
                <i>Latest collection</i>
                <b>{collections[0].name}</b>
                <small>{collections[0].count} assets · Nov 2026</small>
              </span>
            </button>
          ) : null}
          {notice ? <p className="hub-note">{notice}</p> : null}
        </>
      )
    case 'content':
      return (
        <>
          <p className="hub-kicker">My Content</p>
          <h2>{query.trim() ? `Results for “${query.trim()}”` : 'Your content library'}</h2>
          <p className="hub-lead">
            {visible.length} {visible.length === 1 ? 'asset' : 'assets'}
          </p>
          <div className="hub-toolbar">
            <div className="hub-pills">
              {KINDS.map((option) => (
                <button key={option} type="button" className={kind === option ? 'on' : ''} onClick={() => onKind(option)}>
                  {option}
                </button>
              ))}
            </div>
            <div className="hub-toolbar-end">
              {collection ? (
                <button type="button" className="hub-chip" onClick={onClearCollection}>
                  {collection} · clear
                </button>
              ) : null}
              <select value={sort} aria-label="Sort" onChange={(event) => onSort(event.target.value === 'A–Z' ? 'A–Z' : 'Newest')}>
                <option>Newest</option>
                <option>A–Z</option>
              </select>
              <div className="hub-view">
                <button type="button" className={board === 'grid' ? 'on' : ''} aria-label="Grid" onClick={() => onBoard('grid')}>
                  <Icon name="grid" />
                </button>
                <button type="button" className={board === 'list' ? 'on' : ''} aria-label="List" onClick={() => onBoard('list')}>
                  <Icon name="list" />
                </button>
              </div>
            </div>
          </div>
          <ItemBoard items={visible} board={board} onOpen={onOpen} />
          {notice ? <p className="hub-note">{notice}</p> : null}
        </>
      )
    case 'collections':
      return (
        <>
          <p className="hub-kicker">Collections</p>
          <h2>Your collections</h2>
          <p className="hub-lead">Each session stays in its own place.</p>
          <div className="hub-collections">
            {collections.map((item) => (
              <button key={item.name} type="button" className="hub-collection" onClick={() => onOpenCollection(item.name)}>
                <span className={`hub-mosaic mosaic-${item.covers.length}`}>
                  {item.covers.map((src) => (
                    <img key={src} src={src} alt="" />
                  ))}
                  <b>{item.count}</b>
                </span>
                <strong>{item.name}</strong>
                <small>{item.count} assets</small>
              </button>
            ))}
          </div>
        </>
      )
    case 'guides':
      return (
        <>
          <p className="hub-kicker">Guides</p>
          <h2>Quick guides</h2>
          <p className="hub-lead">Short walkthroughs for the things you do most.</p>
          <div className="hub-guides">
            {SHOWN_GUIDES.map((item) => (
              <button key={item.id} type="button" className="hub-guide" onClick={() => onGuide(item.id)}>
                <span>
                  <img src={item.poster} alt="" />
                  <em>
                    <Icon name="play" />
                    {item.duration}
                  </em>
                </span>
                <strong>{item.title}</strong>
                <small>{item.desc}</small>
              </button>
            ))}
          </div>
        </>
      )
    case 'day':
      return (
        <>
          <p className="hub-kicker">Content Day</p>
          <h2>Book the next day.</h2>
          <p className="hub-lead">Pick a date on this page. We confirm it before anything is held.</p>
          <ul className="hub-day">
            <li>
              <b>09:00 to 18:00</b>
              <span>One production day</span>
            </li>
            <li>
              <b>Up to 5 reels</b>
              <span>Or one short horizontal video</span>
            </li>
            <li>
              <b>Up to 40 photographs</b>
              <span>Edited and delivered here</span>
            </li>
            <li>
              <b>Posts, covers and Hub</b>
              <span>Ready to download</span>
            </li>
          </ul>
        </>
      )
    default: {
      const unreachable: never = view
      return unreachable
    }
  }
}

function ItemBoard({ items, board, onOpen }: { items: PreviewItem[]; board: Board; onOpen: (id: string) => void }) {
  if (items.length === 0) return <p className="hub-empty">Nothing matches that search.</p>
  switch (board) {
    case 'grid':
      return (
        <div className="hub-grid">
          {items.map((item) => (
            <button key={item.id} type="button" className="hub-card" onClick={() => onOpen(item.id)}>
              <span className="hub-thumb">
                <img src={item.src} alt={item.title} style={{ objectPosition: item.position }} />
                {item.duration ? (
                  <em>
                    <Icon name="play" />
                    {item.duration}
                  </em>
                ) : null}
                <i>{item.kind === 'Photography' ? 'Photo' : 'Video'}</i>
              </span>
              <b>{item.title}</b>
              <small>
                {item.file} · {item.size}
              </small>
              <span className="hub-tag">{item.collection}</span>
            </button>
          ))}
        </div>
      )
    case 'list':
      return (
        <div className="hub-list">
          {items.map((item) => (
            <button key={item.id} type="button" className="hub-row" onClick={() => onOpen(item.id)}>
              <img src={item.src} alt="" style={{ objectPosition: item.position }} />
              <span>
                <b>{item.title}</b>
                <small>
                  {item.file} · {item.size}
                </small>
              </span>
              <em>{item.kind === 'Photography' ? 'Photo' : 'Video'}</em>
            </button>
          ))}
        </div>
      )
    default: {
      const unreachable: never = board
      return unreachable
    }
  }
}

function AssetPreview({
  item,
  format,
  notice,
  onFormat,
  onBack,
  onNotice,
}: {
  item: PreviewItem
  format: '' | PreviewFormat
  notice: string
  onFormat: (format: '' | PreviewFormat) => void
  onBack: () => void
  onNotice: (message: string) => void
}) {
  const ratio = format ? FORMAT_RATIO[format] : null
  return (
    <article className="hub-asset">
      <div>
        <button type="button" className="hub-back" onClick={onBack}>
          ← Back to content
        </button>
        <div
          className={ratio ? 'hub-frame is-shaped' : 'hub-frame'}
          style={ratio ? { ['--frame-ratio' as string]: String(ratio) } : undefined}
        >
          {item.video ? (
            <video controls playsInline preload="metadata" poster={item.src} src={item.video} aria-label={item.title} />
          ) : (
            <img src={item.src} alt={item.title} style={{ objectPosition: item.position }} />
          )}
        </div>
        {item.kind === 'Photography' ? (
          <div className="hub-notes">
            <div>
              <span>Collection</span>
              <b className="hub-tag">{item.collection}</b>
            </div>
            <div>
              <span>Tags</span>
              <p>
                {item.tags.map((tag) => (
                  <i key={tag}>{tag}</i>
                ))}
              </p>
            </div>
            <div>
              <span>Suggested use</span>
              <small>{item.use}</small>
            </div>
          </div>
        ) : null}
      </div>
      <aside>
        <p className="hub-kicker">{item.kind}</p>
        <h2>{item.title}</h2>
        <p className="hub-lead">
          {item.file} · {item.duration || 'Final'} · {item.orientation}
        </p>
        {item.formats.length > 0 ? (
          <div className="hub-pills" role="radiogroup" aria-label="Photo format">
            <button type="button" className={format === '' ? 'on' : ''} onClick={() => onFormat('')}>
              Default
            </button>
            {item.formats.map((name) => (
              <button key={name} type="button" className={format === name ? 'on' : ''} onClick={() => onFormat(name)}>
                {name}
              </button>
            ))}
          </div>
        ) : null}
        <dl>
          <div>
            <dt>Format</dt>
            <dd>{format || item.orientation}</dd>
          </div>
          <div>
            <dt>File size</dt>
            <dd>{item.size}</dd>
          </div>
          <div>
            <dt>File type</dt>
            <dd>{item.fileType}</dd>
          </div>
        </dl>
        <button type="button" className="hub-download" onClick={() => onNotice('Downloads open after you sign in.')}>
          <Icon name="download" /> Download
        </button>
        {notice ? <small className="hub-note">{notice}</small> : null}
      </aside>
    </article>
  )
}

function GuidePreview({
  title,
  text,
  poster,
  steps,
  onBack,
}: {
  title: string
  text: string
  poster: string
  steps: string[]
  onBack: () => void
}) {
  return (
    <article className="hub-guide-open">
      <button type="button" className="hub-back" onClick={onBack}>
        ← Back to guides
      </button>
      <img src={poster} alt="" />
      <h2>{title}</h2>
      <p className="hub-lead">{text}</p>
      <ol>
        {steps.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>
    </article>
  )
}
