'use client'

import { useEffect, useRef, useState } from 'react'

export function useProgressiveCount(total: number, resetKey: string, batchSize = 48) {
  const [limit, setLimit] = useState(batchSize)
  const sentinelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setLimit(batchSize)
  }, [resetKey, batchSize])

  const shown = Math.min(limit, total)
  const hasMore = shown < total

  useEffect(() => {
    if (!hasMore) return undefined
    const node = sentinelRef.current
    if (!node || typeof IntersectionObserver === 'undefined') return undefined
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          setLimit((current) => Math.min(total, current + batchSize))
        }
      },
      { rootMargin: '400px 0px' },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [hasMore, total, batchSize])

  return {
    shown,
    hasMore,
    sentinelRef,
    showMore: () => setLimit((current) => Math.min(total, current + batchSize)),
  }
}
