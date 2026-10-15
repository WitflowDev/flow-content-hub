'use client'

import type { MouseEvent } from 'react'
import { Icon } from '@/components/icons'
import { tagClass } from '@/lib/library'
import { useApp } from '@/state/AppState'
import type { MediaItem } from '@/data/types'

export function MediaListRow({ item }: { item: MediaItem }) {
  const { selected, toggleSelected, navigate } = useApp()
  const isSelected = selected.has(item.id)
  const channelClass = tagClass(item.channel)

  function openAsset(event: MouseEvent<HTMLElement>) {
    const target = event.target
    if (target instanceof Element && target.closest('[data-select], .kebab')) return
    navigate(`/asset/${item.id}`)
  }

  return (
    <article className={isSelected ? 'media-row selected' : 'media-row'} onClick={openAsset}>
      <button
        type="button"
        className={isSelected ? 'select-box list-select on' : 'select-box list-select'}
        data-select={item.id}
        onClick={(event) => {
          event.stopPropagation()
          toggleSelected(item.id)
        }}
      >
        {isSelected ? <Icon name="check" /> : null}
      </button>
      <img src={item.src} alt="" style={{ objectPosition: item.position }} />
      <div className="row-copy">
        <b>{item.title}</b>
        <small>{item.collection}</small>
      </div>
      <span className={channelClass ? `tag ${channelClass}` : 'tag'}>{item.channel}</span>
      <span className="row-meta">
        {item.file} · {item.size}
      </span>
      <button type="button" className="kebab" onClick={(event) => event.stopPropagation()}>
        •••
      </button>
    </article>
  )
}
