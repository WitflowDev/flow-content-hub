'use client'

import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'
import type { Collection } from '@/data/types'

export function CollectionTile({ collection }: { collection: Collection }) {
  const { navigate } = useApp()
  const { getMedia } = useLibrary()
  const covers = collection.cover.map((id) => getMedia(id))
  const primary = covers[0]
  const secondary = covers[1]
  const tertiary = covers[2]
  if (!primary || !secondary || !tertiary) return null

  return (
    <button type="button" className="collection-tile card" onClick={() => navigate(`/collection/${collection.slug}`, true)}>
      <div className="collection-cover">
        <img src={primary.src} alt="" style={{ objectPosition: primary.position }} />
        <div className="split">
          <img src={secondary.src} alt="" style={{ objectPosition: secondary.position }} />
          <img src={tertiary.src} alt="" style={{ objectPosition: tertiary.position }} />
        </div>
        <span className="asset-total">{collection.count}</span>
      </div>
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
