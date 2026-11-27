'use client'

import { memo, type MouseEvent } from 'react'
import { Icon } from '@/components/icons'
import { MediaActions } from '@/components/media/MediaActions'
import { SelectBox } from '@/components/media/SelectBox'
import { AssetTags } from '@/components/media/AssetTags'
import { FavoriteButton } from '@/components/media/FavoriteButton'
import { MediaThumb } from '@/components/media/MediaThumb'
import { useAppActions } from '@/state/AppState'
import type { MediaItem } from '@/data/types'

export const MediaCard = memo(function MediaCard({
  item,
  selectable = false,
  eager = false,
}: {
  item: MediaItem
  selectable?: boolean
  eager?: boolean
}) {
  const { navigate } = useAppActions()

  function openAsset(event: MouseEvent<HTMLElement>) {
    const target = event.target
    if (target instanceof Element && target.closest('[data-select], .kebab-wrap, [data-favorite]')) return
    navigate(`/asset/${item.id}`)
  }

  return (
    <article className="media-card" onClick={openAsset}>
      <div className="thumb">
        <MediaThumb item={item} eager={eager} />
        {item.duration ? (
          <span className="duration">
            <Icon name="play" />
            {item.duration}
          </span>
        ) : null}
        {item.driveFileId ? <FavoriteButton fileId={item.driveFileId} /> : null}
        {selectable ? <SelectBox id={item.id} title={item.title} /> : null}
        <span className="asset-type-badge">{item.type === 'Photography' ? 'Photo' : item.type}</span>
      </div>
      <div className="media-card-meta">
        <div>
          <div className="media-card-title">{item.title}</div>
          <div className="media-card-sub">
            {item.file} <span>·</span> {item.size}
          </div>
          <AssetTags item={item} />
        </div>
        <MediaActions item={item} />
      </div>
    </article>
  )
})
