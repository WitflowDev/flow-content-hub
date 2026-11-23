'use client'

import { memo, type MouseEvent } from 'react'
import { MediaActions } from '@/components/media/MediaActions'
import { SelectBox } from '@/components/media/SelectBox'
import { AssetTags } from '@/components/media/AssetTags'
import { FavoriteButton } from '@/components/media/FavoriteButton'
import { MediaThumb } from '@/components/media/MediaThumb'
import { useApp } from '@/state/AppState'
import type { MediaItem } from '@/data/types'

export const MediaListRow = memo(function MediaListRow({ item }: { item: MediaItem }) {
  const { navigate } = useApp()

  function openAsset(event: MouseEvent<HTMLElement>) {
    const target = event.target
    if (target instanceof Element && target.closest('[data-select], .kebab-wrap, [data-favorite]')) return
    navigate(`/asset/${item.id}`)
  }

  return (
    <article className="media-row" onClick={openAsset}>
      <SelectBox id={item.id} title={item.title} variant="list" />
      <div className="row-thumb">
        <MediaThumb item={item} />
        {item.driveFileId ? <FavoriteButton fileId={item.driveFileId} /> : null}
      </div>
      <div className="row-copy">
        <b>{item.title}</b>
        <small>{item.collection}</small>
      </div>
      <AssetTags item={item} />
      <span className="row-meta">
        {item.file} · {item.size}
      </span>
      <MediaActions item={item} />
    </article>
  )
})
