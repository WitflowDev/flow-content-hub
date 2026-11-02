'use client'

import { Icon } from '@/components/icons'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'
import type { Collection } from '@/data/types'

export function CollectionFeature({ collection }: { collection: Collection }) {
  const { navigate } = useApp()
  const { getMedia } = useLibrary()
  const covers = collection.cover.flatMap((id) => {
    const item = getMedia(id)
    return item ? [item] : []
  })

  return (
    <div className="collection-feature card" onClick={() => navigate(`/collection/${collection.slug}`, true)}>
      {covers.length > 0 ? (
        <div className="collection-stack">
          {covers.map((item) => (
            <img key={item.id} src={item.src} alt="" style={{ objectPosition: item.position }} />
          ))}
          {covers.length >= 3 && collection.count > 3 ? (
            <span className="collection-count">+{collection.count - 3}</span>
          ) : null}
        </div>
      ) : null}
      <div className="collection-feature-copy">
        <div className="eyebrow">Latest collection</div>
        <h3>{collection.title}</h3>
        <p>
          {collection.count} assets <span>·</span> Updated {collection.date}
        </p>
      </div>
      <button type="button" className="btn soft">
        Open collection <Icon name="arrow" />
      </button>
    </div>
  )
}
