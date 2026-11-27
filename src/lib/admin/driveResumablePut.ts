import { isDriveFileId } from '@/lib/drive/ids'

const INITIAL_CHUNK_BYTES = 8 * 1024 * 1024
const MAX_CHUNK_BYTES = 32 * 1024 * 1024
const FAST_CHUNK_THRESHOLD_MS = 2000
const MAX_RETRIES = 3

class NetworkUploadError extends Error {}

export async function putResumableToDrive(
  file: File,
  mimeType: string,
  uploadUrl: string,
  options?: {
    signal?: AbortSignal
    onProgress?: (loadedBytes: number) => void
  },
): Promise<string> {
  const signal = options?.signal
  const onProgress = options?.onProgress
  const total = file.size

  if (signal?.aborted) throw new Error('The upload was cancelled.')

  if (total <= INITIAL_CHUNK_BYTES) {
    return putSingleAttempt(file, mimeType, uploadUrl, signal, onProgress)
  }

  let offset = 0
  let chunkBytes = INITIAL_CHUNK_BYTES
  let retries = 0

  while (offset < total) {
    if (signal?.aborted) throw new Error('The upload was cancelled.')
    const end = Math.min(offset + chunkBytes, total)
    const chunk = file.slice(offset, end)
    const startedAt = Date.now()
    try {
      const result = await sendPut({
        uploadUrl,
        body: chunk,
        mimeType,
        contentRange: `bytes ${offset}-${end - 1}/${total}`,
        signal,
        onChunkProgress: (loaded) => onProgress?.(offset + loaded),
      })

      if (result.status === 200 || result.status === 201) {
        onProgress?.(total)
        return extractDriveId(result.responseText)
      }
      if (result.status === 308) {
        const committed = parseCommittedEnd(result.rangeHeader)
        offset = committed !== null ? committed + 1 : end
        onProgress?.(offset)
        retries = 0
        // Adaptive chunking: double chunk size (up to 32 MiB) when upload throughput is fast.
        if (Date.now() - startedAt < FAST_CHUNK_THRESHOLD_MS && chunkBytes < MAX_CHUNK_BYTES) {
          chunkBytes = Math.min(MAX_CHUNK_BYTES, chunkBytes * 2)
        }
        continue
      }
      if (isRetryableStatus(result.status) && retries < MAX_RETRIES) {
        retries += 1
        await waitWithSignal(backoffMs(retries), signal)
        const probe = await queryResumableOffset(uploadUrl, total, signal)
        if (probe.done) {
          onProgress?.(total)
          return probe.fileId
        }
        offset = probe.offset
        onProgress?.(offset)
        continue
      }
      throw new Error(`The file could not be saved to Drive (${result.status}).`)
    } catch (error) {
      if (error instanceof NetworkUploadError && retries < MAX_RETRIES && !signal?.aborted) {
        retries += 1
        chunkBytes = INITIAL_CHUNK_BYTES
        await waitWithSignal(backoffMs(retries), signal)
        const probe = await queryResumableOffset(uploadUrl, total, signal)
        if (probe.done) {
          onProgress?.(total)
          return probe.fileId
        }
        offset = probe.offset
        onProgress?.(offset)
        continue
      }
      throw error
    }
  }

  throw new Error('The file could not be saved to Drive.')
}

async function putSingleAttempt(
  file: File,
  mimeType: string,
  uploadUrl: string,
  signal: AbortSignal | undefined,
  onProgress: ((loadedBytes: number) => void) | undefined,
): Promise<string> {
  let retries = 0
  while (true) {
    if (signal?.aborted) throw new Error('The upload was cancelled.')
    try {
      const result = await sendPut({
        uploadUrl,
        body: file,
        mimeType,
        signal,
        onChunkProgress: onProgress,
      })
      if (result.status === 200 || result.status === 201) {
        onProgress?.(file.size)
        return extractDriveId(result.responseText)
      }
      if (isRetryableStatus(result.status) && retries < MAX_RETRIES) {
        retries += 1
        await waitWithSignal(backoffMs(retries), signal)
        continue
      }
      throw new Error(`The file could not be saved to Drive (${result.status}).`)
    } catch (error) {
      if (error instanceof NetworkUploadError && retries < MAX_RETRIES && !signal?.aborted) {
        retries += 1
        await waitWithSignal(backoffMs(retries), signal)
        continue
      }
      throw error
    }
  }
}

function sendPut(options: {
  uploadUrl: string
  body: Blob | null
  mimeType?: string
  contentRange?: string
  signal?: AbortSignal
  onChunkProgress?: (loaded: number) => void
}): Promise<{ status: number; responseText: string; rangeHeader: string | null }> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    const onAbort = () => xhr.abort()
    options.signal?.addEventListener('abort', onAbort, { once: true })
    const cleanup = () => options.signal?.removeEventListener('abort', onAbort)

    xhr.open('PUT', options.uploadUrl, true)
    if (options.mimeType) xhr.setRequestHeader('Content-Type', options.mimeType)
    if (options.contentRange) xhr.setRequestHeader('Content-Range', options.contentRange)
    if (options.onChunkProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable) options.onChunkProgress?.(event.loaded)
      }
    }
    xhr.onload = () => {
      cleanup()
      resolve({
        status: xhr.status,
        responseText: xhr.responseText ?? '',
        rangeHeader: xhr.getResponseHeader('Range'),
      })
    }
    xhr.onerror = () => {
      cleanup()
      reject(new NetworkUploadError('The connection to Google Drive was interrupted.'))
    }
    xhr.onabort = () => {
      cleanup()
      reject(new Error('The upload was cancelled.'))
    }
    xhr.send(options.body)
  })
}

async function queryResumableOffset(
  uploadUrl: string,
  total: number,
  signal: AbortSignal | undefined,
): Promise<{ done: true; fileId: string } | { done: false; offset: number }> {
  const probe = await sendPut({
    uploadUrl,
    body: null,
    contentRange: `bytes */${total}`,
    signal,
  })
  if (probe.status === 200 || probe.status === 201) {
    return { done: true, fileId: extractDriveId(probe.responseText) }
  }
  if (probe.status === 308) {
    const committed = parseCommittedEnd(probe.rangeHeader)
    return { done: false, offset: committed !== null ? committed + 1 : 0 }
  }
  throw new Error(`The upload could not be resumed (${probe.status}).`)
}

function parseCommittedEnd(rangeHeader: string | null): number | null {
  if (!rangeHeader) return null
  const match = /bytes=\d+-(\d+)/i.exec(rangeHeader)
  if (!match) return null
  const end = Number(match[1])
  return Number.isFinite(end) && end >= 0 ? end : null
}

function extractDriveId(responseText: string): string {
  try {
    const parsed = JSON.parse(responseText) as { id?: unknown }
    if (typeof parsed.id === 'string' && isDriveFileId(parsed.id)) return parsed.id
  } catch {
    // Fall through to error.
  }
  throw new Error('The file could not be saved to Drive.')
}

function isRetryableStatus(status: number): boolean {
  return status === 0 || status === 408 || status === 429 || (status >= 500 && status <= 599)
}

function backoffMs(attempt: number): number {
  return Math.min(4000, 600 * 2 ** (attempt - 1))
}

function waitWithSignal(ms: number, signal: AbortSignal | undefined): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new Error('The upload was cancelled.'))
      return
    }
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new Error('The upload was cancelled.'))
    }
    signal?.addEventListener('abort', onAbort, { once: true })
  })
}
