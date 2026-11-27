'use client'

import { useState } from 'react'

export function TutorialImage({
  id,
  alt,
  animate = 'hover',
  active = false,
}: {
  id: string
  alt: string
  animate?: 'always' | 'hover'
  active?: boolean
}) {
  const [hovered, setHovered] = useState(false)
  const poster = `/assets/tutorials/${id}.png?v=2`
  const gif = `/assets/tutorials/${id}.gif?v=2`
  const showGif = animate === 'always' || active || hovered

  return (
    <picture
      onPointerEnter={animate === 'hover' ? () => setHovered(true) : undefined}
      onPointerLeave={animate === 'hover' ? () => setHovered(false) : undefined}
    >
      {showGif ? <source media="(prefers-reduced-motion: reduce)" srcSet={poster} /> : null}
      <img
        loading={animate === 'always' ? 'eager' : 'lazy'}
        decoding="async"
        src={showGif ? gif : poster}
        alt={alt}
      />
    </picture>
  )
}
