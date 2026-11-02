'use client'

import { useEffect, useRef, useState } from 'react'
import type { SyntheticEvent } from 'react'

const FRAME_AT_SECONDS = 2

export function DriveVideoFrame({
  fileId,
  fallbackSrc,
  position,
  alt,
}: {
  fileId: string
  fallbackSrc: string
  position: string
  alt: string
}) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const [failed, setFailed] = useState(false)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    if (ready || failed) return
    const timer = window.setTimeout(() => setFailed(true), 12000)
    return () => window.clearTimeout(timer)
  }, [ready, failed])

  function pauseAtFrame(video: HTMLVideoElement) {
    const duration = video.duration
    const target =
      Number.isFinite(duration) && duration > 0.2 ? Math.min(FRAME_AT_SECONDS, Math.max(0, duration - 0.1)) : FRAME_AT_SECONDS
    video.pause()
    if (Math.abs(video.currentTime - target) > 0.2) {
      video.currentTime = target
      return
    }
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) setReady(true)
  }

  function onLoadedMetadata(event: SyntheticEvent<HTMLVideoElement>) {
    pauseAtFrame(event.currentTarget)
  }

  function onSeeked(event: SyntheticEvent<HTMLVideoElement>) {
    const video = event.currentTarget
    video.pause()
    if (video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) setReady(true)
  }

  function onPlay(event: SyntheticEvent<HTMLVideoElement>) {
    event.currentTarget.pause()
  }

  if (failed) {
    return <img src={fallbackSrc} alt={alt} style={{ objectPosition: position }} />
  }

  return (
    <>
      <img src={fallbackSrc} alt={alt} style={{ objectPosition: position }} hidden={ready} />
      <video
        ref={videoRef}
        className={ready ? 'is-ready' : undefined}
        src={`/api/drive/files/${fileId}/stream#t=${FRAME_AT_SECONDS}`}
        muted
        playsInline
        preload="metadata"
        disablePictureInPicture
        aria-hidden="true"
        tabIndex={-1}
        onLoadedMetadata={onLoadedMetadata}
        onLoadedData={onSeeked}
        onSeeked={onSeeked}
        onError={() => setFailed(true)}
        onPlay={onPlay}
        style={{ objectPosition: position }}
      />
    </>
  )
}
