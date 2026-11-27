'use client'

import { useEffect } from 'react'
import { usePathname } from 'next/navigation'
import type { MediaItem } from '@/data/types'
import { streamPath, videoPrefixLength } from '@/lib/drive/prefix-budget'
import { useLibrary } from '@/state/Catalog'

const warmed = new Set<string>()
const LIGHT_CONCURRENCY = 2
const START_DELAY_MS = 1500
const MAX_PREFETCH_THUMBS = 24
const MAX_PREFETCH_PREVIEWS = 8
const MAX_PREFETCH_VIDEOS = 2
// Keep prefetched prefixes under 1.2 MB so they fit cleanly in Next.js Data Cache (< 2 MB base64).
const MAX_PREFETCH_VIDEO_BYTES = 1_200_000

type NetworkInformation = {
  saveData?: boolean
  effectiveType?: string
}

type Job =
  | { kind: 'image'; url: string; heavy: boolean }
  | { kind: 'video'; url: string; length: number }

export function LibraryPrefetch() {
  const { media } = useLibrary()
  const pathname = usePathname()
  const isAdmin = pathname.startsWith('/admin')
  const sources = queueSignature(media)

  useEffect(() => {
    if (isAdmin || shouldSkip() || sources.length === 0) return
    const pending = sources
      .split('\n')
      .map(parseJob)
      .filter((job): job is Job => job !== null && !warmed.has(jobKey(job)))
    if (pending.length === 0) return

    let stopped = false
    let cancelWait = () => {}
    const controller = new AbortController()
    const timer = window.setTimeout(() => {
      void pump()
    }, START_DELAY_MS)

    async function pump() {
      while (!stopped && pending.length > 0) {
        if (document.hidden) await waitUntilVisible()
        if (stopped) return
        await Promise.all(takeBatch(pending).map((job) => warm(job, controller.signal)))
      }
    }

    function waitUntilVisible(): Promise<void> {
      if (!document.hidden) return Promise.resolve()
      return new Promise((resolve) => {
        const finish = () => {
          document.removeEventListener('visibilitychange', finish)
          resolve()
        }
        cancelWait = finish
        document.addEventListener('visibilitychange', finish)
      })
    }

    return () => {
      stopped = true
      controller.abort()
      window.clearTimeout(timer)
      cancelWait()
    }
  }, [isAdmin, sources])

  return null
}

function queueSignature(items: MediaItem[]): string {
  const thumbs: string[] = []
  const photos: string[] = []
  const videos: string[] = []
  for (const item of items) {
    if (!item.src.includes('/api/drive/files/') || !item.src.includes('/thumbnail')) continue
    if (thumbs.length < MAX_PREFETCH_THUMBS) {
      thumbs.push(`image\t${item.src}\tlight`)
    }
    if (item.type === 'Photography' && photos.length < MAX_PREFETCH_PREVIEWS) {
      photos.push(`image\t${item.src.replace('/thumbnail', '/preview')}\theavy`)
    }
    if (item.type === 'Video' && item.driveFileId && item.bytes && videos.length < MAX_PREFETCH_VIDEOS) {
      const length = Math.min(videoPrefixLength(item.bytes), MAX_PREFETCH_VIDEO_BYTES)
      if (length > 0) videos.push(`video\t${streamPath(item.src, item.driveFileId, true)}\t${length}`)
    }
    if (
      thumbs.length >= MAX_PREFETCH_THUMBS &&
      photos.length >= MAX_PREFETCH_PREVIEWS &&
      videos.length >= MAX_PREFETCH_VIDEOS
    ) {
      break
    }
  }
  return [...thumbs, ...photos, ...videos].join('\n')
}

function parseJob(line: string): Job | null {
  const [kind, url, extra] = line.split('\t')
  if (!url) return null
  if (kind === 'image' && (extra === 'light' || extra === 'heavy')) return { kind: 'image', url, heavy: extra === 'heavy' }
  if (kind === 'video') {
    const length = Number(extra)
    if (Number.isFinite(length) && length > 0) return { kind: 'video', url, length }
  }
  return null
}

function takeBatch(pending: Job[]): Job[] {
  const first = pending[0]
  if (!first) return []
  if (first.kind === 'video' || first.heavy) {
    const job = pending.shift()
    return job ? [job] : []
  }
  const batch: Job[] = []
  while (batch.length < LIGHT_CONCURRENCY) {
    const next = pending[0]
    if (!next || next.kind !== 'image' || next.heavy) break
    const job = pending.shift()
    if (!job) break
    batch.push(job)
  }
  return batch
}

function jobKey(job: Job): string {
  switch (job.kind) {
    case 'image':
      return job.url
    case 'video':
      return `${job.url} ${job.length}`
    default: {
      const unreachable: never = job
      return unreachable
    }
  }
}

function warm(job: Job, signal: AbortSignal): Promise<void> {
  if (signal.aborted) return Promise.resolve()
  const key = jobKey(job)
  if (warmed.has(key)) return Promise.resolve()
  warmed.add(key)
  const done = (loaded: boolean) => {
    if (!loaded) warmed.delete(key)
  }
  switch (job.kind) {
    case 'image':
      return warmImage(job.url, signal).then(done)
    case 'video':
      return warmVideo(job.url, job.length, signal).then(done)
    default: {
      const unreachable: never = job
      return unreachable
    }
  }
}

function warmImage(url: string, signal: AbortSignal): Promise<boolean> {
  if (signal.aborted) return Promise.resolve(false)
  return new Promise((resolve) => {
    const image = new Image()
    const onAbort = () => {
      image.src = ''
      resolve(false)
    }
    signal.addEventListener('abort', onAbort, { once: true })
    image.decoding = 'async'
    image.fetchPriority = 'low'
    image.onload = () => {
      signal.removeEventListener('abort', onAbort)
      resolve(true)
    }
    image.onerror = () => {
      signal.removeEventListener('abort', onAbort)
      resolve(false)
    }
    image.src = url
  })
}

function warmVideo(url: string, length: number, signal: AbortSignal): Promise<boolean> {
  return fetch(url, {
    headers: { Range: `bytes=0-${length - 1}` },
    credentials: 'same-origin',
    priority: 'low',
    signal,
  })
    .then(async (response) => {
      if (!response.ok || !response.body) return false
      await response.body.cancel().catch(() => undefined)
      return true
    })
    .catch(() => false)
}

function shouldSkip(): boolean {
  const connection = (navigator as Navigator & { connection?: NetworkInformation }).connection
  if (!connection) return false
  if (connection.saveData) return true
  return connection.effectiveType === 'slow-2g' || connection.effectiveType === '2g'
}
