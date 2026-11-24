'use client'

import { useMemo, useState, type FormEvent } from 'react'
import { Icon } from '@/components/icons'
import { ContentDayOffer } from '@/components/feedback/ContentDayOffer'
import { FlowTip } from '@/components/feedback/FlowTip'
import { BulkBar, EmptyState } from '@/components/media/BulkBar'
import { MediaCard } from '@/components/media/MediaCard'
import { MediaListRow } from '@/components/media/MediaListRow'
import { CONTENT_TYPE_FILTERS, SORT_MODES } from '@/data/types'
import type { SortMode } from '@/data/types'
import { ARCHIVE_FORMATS, mediaTags, type ArchiveFormat, type SearchCloseness } from '@/lib/library'
import { useApp, useSelectionActions } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'

function isArchiveFormat(value: string): value is ArchiveFormat {
  return (ARCHIVE_FORMATS as readonly string[]).includes(value)
}

function isSortMode(value: string): value is SortMode {
  return (SORT_MODES as readonly string[]).includes(value)
}

function searchSummary(closeness: SearchCloseness, count: number): string {
  switch (closeness) {
    case 'exact':
      return `${count} matching ${count === 1 ? 'asset' : 'assets'}`
    case 'half':
      return count === 1
        ? 'No exact match. 1 asset shares at least half of that text.'
        : `No exact match. ${count} assets share at least half of that text.`
    case 'quarter':
      return count === 1
        ? 'No closer match. 1 asset shares at least a quarter of that text.'
        : `No closer match. ${count} assets share at least a quarter of that text.`
    default: {
      const unexpected: never = closeness
      return unexpected
    }
  }
}

export function ContentScreen() {
  const {
    search,
    setSearch,
    contentType,
    setContentType,
    channel,
    setChannel,
    sort,
    setSort,
    view,
    setView,
  } = useApp()
  const { clearSelected } = useSelectionActions()
  const { media, collections, filteredMedia: applyFilters } = useLibrary()
  const [year, setYear] = useState('All')
  const [collectionName, setCollectionName] = useState('All')
  const [format, setFormat] = useState<ArchiveFormat>('All')
  const tagFilters = useMemo(() => {
    const names = new Set<string>()
    for (const item of media) {
      for (const tag of mediaTags(item)) names.add(tag)
    }
    return ['All', ...[...names].sort((left, right) => left.localeCompare(right))]
  }, [media])

  const years = useMemo(() => {
    const values = new Set<number>()
    for (const item of media) {
      if (item.year) values.add(item.year)
    }
    return [...values].sort((left, right) => right - left)
  }, [media])

  const outcome = useMemo(
    () => applyFilters({ search, contentType, channel, sort, year, collection: collectionName, format }),
    [applyFilters, search, contentType, channel, sort, year, collectionName, format],
  )
  const results = outcome.items
  const filtering = Boolean(search) || contentType !== 'All' || channel !== 'All' || year !== 'All' || collectionName !== 'All' || format !== 'All'

  function clearFilters() {
    setSearch('')
    setContentType('All')
    setChannel('All')
    setYear('All')
    setCollectionName('All')
    setFormat('All')
    clearSelected()
  }

  function onSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const field = event.currentTarget.elements.namedItem('q')
    const query = field instanceof HTMLInputElement ? field.value.trim() : ''
    setSearch(query)
  }

  return (
    <div className="page content-page">
      <header className="page-head">
        <div className="page-title">
          <div className="eyebrow">My Content</div>
          <h1>{search ? `Results for “${search}”` : 'Your content library'}</h1>
          <p>{search ? searchSummary(outcome.closeness, results.length) : 'Browse, filter and download every final asset in one place.'}</p>
        </div>
      </header>
      <section className="library-toolbar card">
        <form id="content-search-form" className="content-search" onSubmit={onSearch}>
          <Icon name="search" />
          <input key={search} name="q" defaultValue={search} placeholder="Search the archive by title, collection, caption or year…" />
          <button type="submit" className="search-submit">
            Search
          </button>
        </form>
        <div className="toolbar-row">
          <div className="filter-group">
            <span className="filter-label">Type</span>
            {CONTENT_TYPE_FILTERS.map((type) => (
              <button
                key={type}
                type="button"
                className={contentType === type ? 'pill active' : 'pill'}
                onClick={() => {
                  setContentType(type)
                  clearSelected()
                }}
              >
                {type}
              </button>
            ))}
          </div>
          {tagFilters.length > 1 ? (
            <div className="filter-group">
              <span className="filter-label">Tags</span>
              {tagFilters.map((item) => (
                <button
                  key={item}
                  type="button"
                  className={channel === item ? 'pill active' : 'pill'}
                  onClick={() => {
                    setChannel(item)
                    clearSelected()
                  }}
                >
                  {item}
                </button>
              ))}
            </div>
          ) : null}
          <div className="filter-group">
            <span className="filter-label">Year</span>
            <select className="sort-select" value={year} onChange={(event) => setYear(event.target.value)}>
              <option value="All">All years</option>
              {years.map((item) => (
                <option key={item} value={String(item)}>
                  {item}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Collection</span>
            <select className="sort-select" value={collectionName} onChange={(event) => setCollectionName(event.target.value)}>
              <option value="All">All collections</option>
              {collections.map((item) => (
                <option key={item.slug} value={item.title}>
                  {item.title}
                </option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <span className="filter-label">Format</span>
            {ARCHIVE_FORMATS.map((item) => (
              <button
                key={item}
                type="button"
                className={format === item ? 'pill active' : 'pill'}
                onClick={() => {
                  if (isArchiveFormat(item)) setFormat(item)
                }}
              >
                {item}
              </button>
            ))}
          </div>
          <div className="toolbar-spacer" />
          <select
            className="sort-select"
            value={sort}
            onChange={(event) => {
              if (isSortMode(event.target.value)) setSort(event.target.value)
            }}
          >
            {SORT_MODES.map((mode) => (
              <option key={mode}>{mode}</option>
            ))}
          </select>
          <div className="view-toggle">
            <button type="button" className={view === 'grid' ? 'active' : undefined} onClick={() => setView('grid')}>
              <Icon name="grid" />
            </button>
            <button type="button" className={view === 'list' ? 'active' : undefined} onClick={() => setView('list')}>
              <Icon name="list" />
            </button>
          </div>
        </div>
      </section>
      <ContentDayOffer />
      <BulkBar />
      <div className="results-head">
        <span>
          <b>{results.length}</b> {results.length === 1 ? 'asset' : 'assets'}
        </span>
        {filtering ? (
          <button type="button" className="text-btn purple" onClick={clearFilters}>
            Clear filters
          </button>
        ) : null}
      </div>
      <div className={view === 'grid' ? 'media-grid library-grid' : 'media-list'}>
        {results.length > 0 ? (
          results.map((item) =>
            view === 'grid' ? <MediaCard key={item.id} item={item} selectable /> : <MediaListRow key={item.id} item={item} />,
          )
        ) : (
          <EmptyState onClear={clearFilters} />
        )}
      </div>
      {results.length > 0 ? (
        <FlowTip title="Need copy, publishing or campaign support? Flow can help with the next step." linkText="Ask Flow" />
      ) : null}
    </div>
  )
}
