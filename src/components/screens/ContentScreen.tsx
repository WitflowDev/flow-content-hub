'use client'

import type { FormEvent } from 'react'
import { Icon } from '@/components/icons'
import { FlowTip } from '@/components/feedback/FlowTip'
import { TutorialImage } from '@/components/guides/TutorialImage'
import { BulkBar, EmptyState } from '@/components/media/BulkBar'
import { MediaCard } from '@/components/media/MediaCard'
import { MediaListRow } from '@/components/media/MediaListRow'
import { CHANNEL_FILTERS, CONTENT_TYPE_FILTERS, SORT_MODES } from '@/data/types'
import type { SortMode } from '@/data/types'
import { filteredMedia } from '@/lib/library'
import { useApp } from '@/state/AppState'

function isSortMode(value: string): value is SortMode {
  return (SORT_MODES as readonly string[]).includes(value)
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
    selected,
    clearSelected,
    tipVisible,
    mounted,
    dismissTip,
  } = useApp()

  const results = filteredMedia({ search, contentType, channel, sort })
  const filtering = Boolean(search) || contentType !== 'All' || channel !== 'All'

  function clearFilters() {
    setSearch('')
    setContentType('All')
    setChannel('All')
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
          <p>{search ? `${results.length} matching assets` : 'Browse, filter and download every final asset in one place.'}</p>
        </div>
      </header>
      <section className="library-toolbar card">
        <form id="content-search-form" className="content-search" onSubmit={onSearch}>
          <Icon name="search" />
          <input key={search} name="q" defaultValue={search} placeholder="Search by title, collection or channel…" />
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
          <div className="filter-group">
            <span className="filter-label">Use</span>
            {CHANNEL_FILTERS.map((item) => (
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
      {mounted && tipVisible ? (
        <section className="inline-tip card">
          <div className="inline-tip-icon">
            <Icon name="light" />
          </div>
          <div>
            <div className="eyebrow">Quick tip</div>
            <h3>Use filters to find the right content in seconds.</h3>
            <p>Combine content type, channel and search. Your original files stay untouched.</p>
          </div>
          <div className="inline-tip-gif">
            <TutorialImage id="filters" alt="Using filters" />
          </div>
          <button type="button" className="tip-close" onClick={dismissTip}>
            <Icon name="close" />
          </button>
        </section>
      ) : null}
      {selected.size > 0 ? <BulkBar /> : null}
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
