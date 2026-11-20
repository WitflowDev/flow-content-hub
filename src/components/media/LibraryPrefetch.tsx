'use client'

import { useEffect } from 'react'
import type { MediaItem } from '@/data/types'
import { streamPath, videoPrefixLength } from '@/lib/drive/prefix-budget'
import { useLibrary } from '@/state/Catalog'

const warmed = new Set<string>()
const LIGHT_CONCURRENCY = 2
const START_DELAY_MS = 1500

type NetworkInformation = {
  saveData?: boolean
  effectiveType?: string
}

type Job =
  | { kind: 'image'; url: string; heavy: boolean }
  | { kind: 'video'; url: string; length: number }

export function LibraryPrefetch() {
  const { media } = useLibrary()
  const sources = queueSignature(media)

  useEffect(() => {
    if (shouldSkip() || sources.length === 0) return
    const pending = sources
      .split('\n')
      .map(parseJob)
      .filter((job): job is Job => job !== null && !warmed.has(jobKey(job)))
    if (pending.length === 0) return

    let stopped = false
    let cancelWait = () => {}
    const timer = window.setTimeout(() => {
      void pump()
    }, START_DELAY_MS)

    async function pump() {
      while (!stopped && pending.length > 0) {
        if (document.hidden) await waitUntilVisible()
        if (stopped) return
        await Promise.all(takeBatch(pending).map((job) => warm(job)))
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
      window.clearTimeout(timer)
      cancelWait()
    }
  }, [sources])

  return null
}

function queueSignature(items: MediaItem[]): string {
  const thumbs: string[] = []
  const photos: string[] = []
  const videos: string[] = []
  for (const item of items) {
    if (!item.src.includes('/api/drive/files/') || !item.src.includes('/thumbnail')) continue
    thumbs.push(`image\t${item.src}\tlight`)
    if (item.type === 'Photography') photos.push(`image\t${item.src.replace('/thumbnail', '/preview')}\theavy`)
    if (item.type === 'Video' && item.driveFileId && item.bytes) {
      const length = videoPrefixLength(item.bytes)
      if (length > 0) videos.push(`video\t${streamPath(item.src, item.driveFileId, true)}\t${length}`)
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

function warm(job: Job): Promise<void> {
  const key = jobKey(job)
  if (warmed.has(key)) return Promise.resolve()
  warmed.add(key)
  const done = (loaded: boolean) => {
    if (!loaded) warmed.delete(key)
  }
  switch (job.kind) {
    case 'image':
      return warmImage(job.url).then(done)
    case 'video':
      return warmVideo(job.url, job.length).then(done)
    default: {
      const unreachable: never = job
      return unreachable
    }
  }
}

function warmImage(url: string): Promise<boolean> {
  return new Promise((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    image.fetchPriority = 'low'
    image.onload = () => resolve(true)
    image.onerror = () => resolve(false)
    image.src = url
  })
}

function warmVideo(url: string, length: number): Promise<boolean> {
  return fetch(url, {
    headers: { Range: `bytes=0-${length - 1}` },
    credentials: 'same-origin',
    priority: 'low',
  })
    .then(async (response) => {
      if (!response.ok || !response.body) return false
      await response.arrayBuffer()
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
