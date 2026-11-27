'use client'

import { useEffect, useState } from 'react'
import type { MediaItem } from '@/data/types'

const MAX_RETRIES = 3

function withRetry(src: string, attempt: number): string {
  if (attempt <= 0) return src
  const separator = src.includes('?') ? '&' : '?'
  return `${src}${separator}retry=${attempt}`
}

export function MediaThumb({ item, eager = false }: { item: MediaItem; eager?: boolean }) {
  const [attempt, setAttempt] = useState(0)
  const [scheduled, setScheduled] = useState(false)

  useEffect(() => {
    setAttempt(0)
    setScheduled(false)
  }, [item.src])

  useEffect(() => {
    if (!scheduled || attempt >= MAX_RETRIES) return
    const delay = 2000 * 2 ** attempt
    const timer = window.setTimeout(() => {
      setAttempt((current) => current + 1)
      setScheduled(false)
    }, delay)
    return () => window.clearTimeout(timer)
  }, [scheduled, attempt])

  return (
    <img
      src={withRetry(item.src, attempt)}
      alt={item.title}
      loading={eager ? 'eager' : 'lazy'}
      fetchPriority={eager ? 'high' : undefined}
      decoding="async"
      style={{ objectPosition: item.position || '50% 50%' }}
      onError={() => {
        if (attempt < MAX_RETRIES && !scheduled) setScheduled(true)
      }}
    />
  )
}
