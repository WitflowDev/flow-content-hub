'use client'

import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'
import type { Collection } from '@/data/types'

export function CollectionTile({ collection }: { collection: Collection }) {
  const { navigate } = useApp()
  const { getMedia } = useLibrary()
  const covers = collection.cover.flatMap((id) => {
    const item = getMedia(id)
    return item ? [item] : []
  })
  const primary = covers[0]
  const secondary = covers[1]
  const tertiary = covers[2]
  const coverClass = tertiary ? 'collection-cover' : secondary ? 'collection-cover pair' : 'collection-cover single'

  return (
    <button type="button" className="collection-tile card" onClick={() => navigate(`/collection/${collection.slug}`, true)}>
      {primary ? (
        <div className={coverClass}>
          <img src={primary.src} alt="" style={{ objectPosition: primary.position }} />
          {secondary ? (
            <div className="split">
              <img src={secondary.src} alt="" style={{ objectPosition: secondary.position }} />
              {tertiary ? <img src={tertiary.src} alt="" style={{ objectPosition: tertiary.position }} /> : null}
            </div>
          ) : null}
          <span className="asset-total">{collection.count}</span>
        </div>
      ) : null}
      <div className="collection-body">
        <div>
          <h3>{collection.title}</h3>
          <p>{collection.description}</p>
        </div>
        <span className="collection-meta">
          {collection.count} assets <b>·</b> {collection.date}
        </span>
      </div>
    </button>
  )
}
