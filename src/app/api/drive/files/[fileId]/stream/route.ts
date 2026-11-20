import { openClientVideo } from '@/lib/drive/client'
import { libraryThumb } from '@/lib/drive/library'
import { fillVideoPrefix, readVideoPrefix, type DecodedPrefix } from '@/lib/drive/prefix'
import { VIDEO_PREFIX_CAP } from '@/lib/drive/prefix-budget'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type RouteContext = {
  params: Promise<{ fileId: string }>
}

type ByteRange = {
  start: number
  end: number | null
  header: string
}

export async function GET(request: Request, context: RouteContext) {
  const { fileId } = await context.params
  const folder = await driveFolderForCurrentUser()
  if (!folder) return new Response('Not found', { status: 404 })

  const url = new URL(request.url)
  const version = url.searchParams.get('v') ?? ''
  const range = parseRange(request.headers.get('range'))
  const warm = url.searchParams.get('warm') === '1'

  try {
    const known = await libraryThumb(folder.id, fileId)
    if (known.listed) {
      const warmed = await servePrefix(folder.id, fileId, version, range, warm)
      if (warmed) return warmed
    }
    if (warm) return new Response('Not found', { status: 404 })

    const file = await openClientVideo(folder.id, fileId, range?.header ?? null)
    const headers = new Headers({
      'Content-Type': file.mimeType,
      'Content-Disposition': inlineDisposition(file.name),
      'Accept-Ranges': 'bytes',
      'Cache-Control': 'private, max-age=86400',
    })
    if (file.contentLength) headers.set('Content-Length', file.contentLength)
    if (file.contentRange) headers.set('Content-Range', file.contentRange)
    return new Response(file.body, { status: file.status, headers })
  } catch {
    return new Response('Not found', { status: 404 })
  }
}

async function servePrefix(
  folderId: string,
  fileId: string,
  version: string,
  range: ByteRange | null,
  warm: boolean,
): Promise<Response | null> {
  if (warm) {
    if (!range || range.start !== 0 || range.end === null || range.end + 1 > VIDEO_PREFIX_CAP) return null
    const prefix = await fillVideoPrefix(folderId, fileId, version, range.end)
    const end = Math.min(range.end, prefix.total - 1)
    return prefixResponse(prefix, 0, end, null, true)
  }

  const prefix = await readVideoPrefix(fileId, version)
  if (!prefix) return null
  const start = range?.start ?? 0
  if (start >= prefix.bytes.length || start >= prefix.total) return null
  const requestedEnd = range?.end ?? prefix.total - 1
  const end = Math.min(requestedEnd, prefix.total - 1)
  if (end < start) return null
  if (end < prefix.bytes.length) return prefixResponse(prefix, start, end, null, range !== null)

  const tailEnd = end >= prefix.total - 1 ? '' : String(end)
  const tail = await openClientVideo(folderId, fileId, `bytes=${prefix.bytes.length}-${tailEnd}`)
  return prefixResponse(prefix, start, end, tail.body, range !== null)
}

function prefixResponse(
  prefix: DecodedPrefix,
  start: number,
  end: number,
  tail: ReadableStream<Uint8Array> | null,
  partial: boolean,
): Response {
  const head = prefix.bytes.subarray(start, Math.min(end + 1, prefix.bytes.length))
  const headers = new Headers({
    'Content-Type': prefix.mimeType,
    'Content-Disposition': inlineDisposition(prefix.name),
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'private, max-age=86400',
    'Content-Length': String(end - start + 1),
  })
  if (partial) headers.set('Content-Range', `bytes ${start}-${end}/${prefix.total}`)
  return new Response(concat(head, tail), { status: partial ? 206 : 200, headers })
}

function concat(head: Uint8Array, tail: ReadableStream<Uint8Array> | null): ReadableStream<Uint8Array> {
  if (!tail) {
    return new ReadableStream({
      start(controller) {
        controller.enqueue(head)
        controller.close()
      },
    })
  }
  const rest = tail
  return new ReadableStream({
    async start(controller) {
      controller.enqueue(head)
      const reader = rest.getReader()
      try {
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          if (value) controller.enqueue(value)
        }
        controller.close()
      } catch (error) {
        controller.error(error)
      }
    },
    cancel() {
      return rest.cancel()
    },
  })
}

function parseRange(header: string | null): ByteRange | null {
  if (!header) return null
  const match = /^bytes=(\d+)-(\d*)$/i.exec(header.trim())
  if (!match?.[1]) return null
  const start = Number(match[1])
  const end = match[2] ? Number(match[2]) : null
  if (!Number.isFinite(start) || start < 0) return null
  if (end !== null && (!Number.isFinite(end) || end < start)) return null
  return { start, end, header: `bytes=${start}-${end ?? ''}` }
}

function inlineDisposition(filename: string): string {
  const cleaned = filename.replace(/[\r\n"]/g, '')
  return `inline; filename="${cleaned}"; filename*=UTF-8''${encodeURIComponent(cleaned)}`
}
