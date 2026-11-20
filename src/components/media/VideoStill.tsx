'use client'

import { useRef, useState } from 'react'

function frameAt(duration: number): number {
  if (!Number.isFinite(duration) || duration <= 0) return 1
  return Math.min(1, Math.max(0, duration - 0.05))
}

export function VideoStill({ src, alt }: { src: string; alt: string }) {
  const [ready, setReady] = useState(false)
  const sought = useRef(false)

  function showFrame(video: HTMLVideoElement) {
    const target = frameAt(video.duration)
    if (!sought.current && Math.abs(video.currentTime - target) > 0.04) {
      sought.current = true
      video.currentTime = target
      return
    }
    setReady(true)
  }

  return (
    <video
      className={ready ? 'video-still ready' : 'video-still'}
      src={src}
      muted
      playsInline
      preload="metadata"
      aria-label={alt || undefined}
      onLoadedMetadata={(event) => showFrame(event.currentTarget)}
      onSeeked={(event) => showFrame(event.currentTarget)}
    />
  )
}
