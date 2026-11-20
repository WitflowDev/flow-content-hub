'use client'

import { useRef, useState } from 'react'
import { MediaThumb } from '@/components/media/MediaThumb'
import type { MediaItem } from '@/data/types'

export function InstagramCarousel({
  title,
  items,
  description = '',
}: {
  title: string
  items: MediaItem[]
  description?: string
}) {
  const scroller = useRef<HTMLDivElement>(null)
  const [index, setIndex] = useState(0)
  if (items.length < 2) return null
  const atStart = index <= 0
  const atEnd = index >= items.length - 1

  function go(next: number) {
    const frame = scroller.current
    if (!frame) return
    frame.scrollTo({ left: next * frame.clientWidth, behavior: 'smooth' })
    setIndex(next)
  }

  function onScroll() {
    const frame = scroller.current
    if (!frame || frame.clientWidth === 0) return
    setIndex(Math.min(items.length - 1, Math.max(0, Math.round(frame.scrollLeft / frame.clientWidth))))
  }

  return (
    <article className="ig-post">
      <header className="ig-head">
        <span className="ig-avatar" aria-hidden="true" />
        <b>{title}</b>
      </header>
      <div className="ig-frame">
        <div className="ig-scroller" ref={scroller} onScroll={onScroll}>
          {items.map((item) => (
            <div className="ig-slide" key={item.id}>
              <MediaThumb item={item} />
            </div>
          ))}
        </div>
        <span className="ig-count">
          {index + 1}/{items.length}
        </span>
        {atStart ? null : (
          <button type="button" className="ig-nav prev" aria-label="Previous slide" onClick={() => go(index - 1)}>
            ‹
          </button>
        )}
        {atEnd ? null : (
          <button type="button" className="ig-nav next" aria-label="Next slide" onClick={() => go(index + 1)}>
            ›
          </button>
        )}
      </div>
      {description ? <p className="ig-caption">{description}</p> : null}
      <div className="ig-dots" aria-hidden="true">
        {items.map((slide, slideIndex) => (
          <i key={slide.id} className={slideIndex === index ? 'on' : undefined} />
        ))}
      </div>
    </article>
  )
}
