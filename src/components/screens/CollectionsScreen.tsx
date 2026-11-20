'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'
import { CollectionTile } from '@/components/collections/CollectionTile'
import { FlowTip } from '@/components/feedback/FlowTip'
import { useLibrary } from '@/state/Catalog'
import type { Collection } from '@/data/types'

type CollectionOrder = 'newest' | 'oldest'

function collectionTime(collection: Collection): number {
  const time = Date.parse(collection.updatedAt || collection.date)
  return Number.isNaN(time) ? 0 : time
}

export function CollectionsScreen() {
  const { collections } = useLibrary()
  const [query, setQuery] = useState('')
  const [order, setOrder] = useState<CollectionOrder>('newest')
  const needle = query.trim().toLowerCase()
  const visible = collections
    .filter((collection) => collection.title.toLowerCase().includes(needle))
    .sort((left, right) => {
      const diff = collectionTime(right) - collectionTime(left)
      return order === 'newest' ? diff : -diff
    })

  return (
    <div className="page collections-page">
      <header className="page-head">
        <div className="page-title">
          <div className="eyebrow">Collections</div>
          <h1>Content, grouped around moments.</h1>
          <p>Campaigns, Content Days and brand libraries — without digging through folders.</p>
        </div>
      </header>
      <div className="collections-toolbar">
        <div className="content-search compact">
          <Icon name="search" />
          <input value={query} placeholder="Search collections…" onChange={(event) => setQuery(event.target.value)} />
        </div>
        <select
          className="sort-select"
          value={order}
          onChange={(event) => setOrder(event.target.value === 'oldest' ? 'oldest' : 'newest')}
        >
          <option value="newest">Newest first</option>
          <option value="oldest">Oldest first</option>
        </select>
      </div>
      {visible.length === 0 ? <p className="collection-empty">No collections match that search.</p> : null}
      <div className="collections-grid">
        {visible.map((collection) => (
          <CollectionTile key={collection.slug} collection={collection} />
        ))}
      </div>
      <FlowTip title="Planning another campaign or season? We can build the next collection with you." linkText="Talk to Flow" />
    </div>
  )
}
