import { after } from 'next/server'
import { recordDownload } from '@/lib/admin/downloads'
import { prepareClientZipEntries } from '@/lib/drive/client'
import { isDriveFileId } from '@/lib/drive/ids'
import { filterVisibleFileIds } from '@/lib/drive/library'
import { driveFolderForCurrentUser } from '@/lib/drive/resolve'
import { getSessionUser } from '@/lib/firebase/session'
import { contentDisposition } from '@/lib/http/disposition'
import { reportError } from '@/lib/observe'
import { readPreviewTarget } from '@/lib/preview'
import { createZipStream } from '@/lib/zipStream'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

const MAX_ZIP_FILES = 150

function isSameOrigin(request: Request): boolean {
  const fetchSite = request.headers.get('sec-fetch-site')
  if (fetchSite && fetchSite !== 'same-origin' && fetchSite !== 'same-site' && fetchSite !== 'none') {
    return false
  }
  const origin = request.headers.get('origin')
  if (!origin) return true
  try {
    const urlOrigin = new URL(request.url).origin
    if (origin === urlOrigin) return true
    const forwardedHost = request.headers.get('x-forwarded-host')?.split(',')[0]?.trim()
    const forwardedProto = request.headers.get('x-forwarded-proto')?.split(',')[0]?.trim() || 'https'
    return Boolean(forwardedHost && origin === `${forwardedProto}://${forwardedHost}`)
  } catch {
    return false
  }
}

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response('Forbidden', { status: 403 })

  const user = await getSessionUser()
  if (!user) return new Response('Sign in to download.', { status: 401 })

  const folder = await driveFolderForCurrentUser()
  if (!folder) return new Response('Not found', { status: 404 })

  const parsed = await parseZipRequest(request)
  if (!parsed) return new Response('No files selected.', { status: 400 })

  let fileIds = [...new Set(parsed.fileIds.filter((id) => isDriveFileId(id)))]
  if (fileIds.length === 0) return new Response('No files selected.', { status: 400 })
  if (fileIds.length > MAX_ZIP_FILES) {
    return new Response(`Select up to ${MAX_ZIP_FILES} files at a time.`, { status: 400 })
  }

  const visible = await filterVisibleFileIds(folder.id, fileIds)
  if (visible !== null) {
    fileIds = visible
    if (fileIds.length === 0) return new Response('Not found', { status: 404 })
  }

  const entries = await prepareClientZipEntries(folder.id, fileIds)
  if (entries.length === 0) return new Response('Not found', { status: 404 })

  const preview = await readPreviewTarget()
  if (!preview) {
    const uid = user.uid
    const recorded = entries.map((entry) => ({
      uid,
      fileId: entry.id,
      collectionId: entry.collectionId,
      name: entry.name,
    }))
    after(async () => {
      await Promise.all(
        recorded.map((item) => recordDownload(item).catch((error: unknown) => reportError('downloads.record', error))),
      )
    })
  }

  const archiveName = buildZipFilename(parsed.name || folder.name || 'Flow_Content')
  const stream = createZipStream(entries)

  return new Response(stream, {
    headers: {
      'Content-Type': 'application/zip',
      'Content-Disposition': contentDisposition(archiveName, false),
      'Cache-Control': 'private, no-store',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}

async function parseZipRequest(request: Request): Promise<{ fileIds: string[]; name: string } | null> {
  const contentType = (request.headers.get('content-type') ?? '').toLowerCase()
  try {
    if (contentType.includes('application/json')) {
      const body = (await request.json()) as { fileIds?: unknown; name?: unknown }
      const fileIds = Array.isArray(body.fileIds) ? body.fileIds.map(String) : []
      const name = typeof body.name === 'string' ? body.name : ''
      return { fileIds, name }
    }
    const form = await request.formData()
    const fileIds = form.getAll('fileId').map(String)
    const name = String(form.get('name') ?? '')
    return { fileIds, name }
  } catch {
    return null
  }
}

function buildZipFilename(rawName: string): string {
  const cleaned = rawName
    .replace(/[\r\n"/\\:*?<>|]+/g, ' ')
    .replace(/\s+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80)
  const base = cleaned || 'Flow_Content'
  return base.toLowerCase().endsWith('.zip') ? base : `${base}.zip`
}
