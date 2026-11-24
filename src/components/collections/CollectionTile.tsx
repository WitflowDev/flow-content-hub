'use client'

import { Icon } from '@/components/icons'
import { MediaThumb } from '@/components/media/MediaThumb'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'
import type { Collection } from '@/data/types'

type MosaicCount = 1 | 2 | 3 | 4 | 6 | 9

function mosaicCount(available: number): MosaicCount {
  if (available >= 9) return 9
  if (available >= 6) return 6
  if (available >= 4) return 4
  if (available >= 3) return 3
  if (available >= 2) return 2
  return 1
}

export function CollectionTile({ collection }: { collection: Collection }) {
  const { navigate } = useApp()
  const { getMedia } = useLibrary()
  const covers = collection.cover.flatMap((id) => {
    const item = getMedia(id)
    return item ? [item] : []
  })
  const count = mosaicCount(covers.length)
  const shown = covers.slice(0, count)

  return (
    <button type="button" className="collection-tile card" onClick={() => navigate(`/collection/${collection.slug}`, true)}>
      {shown.length > 0 ? (
        <div className={`collection-cover mosaic-${count}`}>
          {shown.map((item) => (
            <span key={item.id} className="collection-cover-cell">
              <MediaThumb item={item} />
            </span>
          ))}
          <span className="asset-total">{collection.count}</span>
        </div>
      ) : collection.favorites ? (
        <div className="collection-cover collection-cover-empty">
          <Icon name="star" />
          <span className="asset-total">{collection.count}</span>
        </div>
      ) : null}
      <div className="collection-body">
        <div>
          <h3>
            {collection.title}
            {collection.published === false ? <span className="draft-mark">Draft</span> : null}
          </h3>
          {collection.description ? <p>{collection.description}</p> : null}
        </div>
        <span className="collection-meta">
          {collection.count} assets{collection.date ? <> <b>·</b> {collection.date}</> : null}
        </span>
      </div>
    </button>
  )
}
