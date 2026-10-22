'use client'

import { Icon } from '@/components/icons'
import { CollectionTile } from '@/components/collections/CollectionTile'
import { FlowTip } from '@/components/feedback/FlowTip'
import { useLibrary } from '@/state/Catalog'

export function CollectionsScreen() {
  const { collections } = useLibrary()
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
          <input placeholder="Search collections…" />
        </div>
        <select className="sort-select" defaultValue="Newest first">
          <option>Newest first</option>
          <option>Oldest first</option>
        </select>
      </div>
      <div className="collections-grid">
        {collections.map((collection) => (
          <CollectionTile key={collection.slug} collection={collection} />
        ))}
      </div>
      <FlowTip title="Planning another campaign or season? We can build the next collection with you." linkText="Talk to Flow" />
    </div>
  )
}
