'use client'

import type { MouseEvent } from 'react'
import { Icon } from '@/components/icons'
import { DriveVideoFrame } from '@/components/media/DriveVideoFrame'
import { MediaActions } from '@/components/media/MediaActions'
import { tagClass } from '@/lib/library'
import { useApp } from '@/state/AppState'
import type { MediaItem } from '@/data/types'

export function MediaCard({ item, selectable = false }: { item: MediaItem; selectable?: boolean }) {
  const { selected, toggleSelected, navigate } = useApp()
  const isSelected = selected.has(item.id)

  function openAsset(event: MouseEvent<HTMLElement>) {
    const target = event.target
    if (target instanceof Element && target.closest('[data-select], .kebab-wrap')) return
    navigate(`/asset/${item.id}`)
  }

  return (
    <article className={isSelected ? 'media-card selected' : 'media-card'} onClick={openAsset}>
      <div className="thumb">
        {item.type === 'Video' && item.driveFileId ? (
          <DriveVideoFrame
            fileId={item.driveFileId}
            fallbackSrc={item.src}
            position={item.position || '50% 50%'}
            alt={item.title}
          />
        ) : (
          <img src={item.src} alt={item.title} style={{ objectPosition: item.position || '50% 50%' }} />
        )}
        {item.duration ? (
          <span className="duration">
            <Icon name="play" />
            {item.duration}
          </span>
        ) : null}
        {selectable ? (
          <button
            type="button"
            className={isSelected ? 'select-box on' : 'select-box'}
            data-select={item.id}
            aria-label={`Select ${item.title}`}
            onClick={(event) => {
              event.stopPropagation()
              toggleSelected(item.id)
            }}
          >
            {isSelected ? <Icon name="check" /> : null}
          </button>
        ) : null}
        <span className="asset-type-badge">{item.type === 'Photography' ? 'Photo' : item.type}</span>
      </div>
      <div className="media-card-meta">
        <div>
          <div className="media-card-title">{item.title}</div>
          <div className="media-card-sub">
            {item.file} <span>·</span> {item.size}
          </div>
          <span className={tagClass(item.channel) ? `tag ${tagClass(item.channel)}` : 'tag'}>{item.channel}</span>
        </div>
        <MediaActions item={item} />
      </div>
    </article>
  )
}
