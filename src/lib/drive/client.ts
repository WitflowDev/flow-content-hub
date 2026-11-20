import 'server-only'
import { readFileSync } from 'node:fs'
import { JWT } from 'google-auth-library'
import type { ClientFolder } from './access'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const GRID_THUMBNAIL_SIZE = 640
const MEDIA_ACCESS_TTL_MS = 60_000
const MEDIA_ACCESS_LIMIT = 400
const WIDE_IMAGE_SIZE = 2000
const CONTENT_HUB_NAME = 'Content Hub'
const CLIENTS_FOLDER_NAME = 'Clients'
const FOLDER_MIME = 'application/vnd.google-apps.folder'
const FILE_FIELDS = 'id,name,mimeType,size,modifiedTime,parents,thumbnailLink,imageMediaMetadata(width,height),videoMediaMetadata(width,height,durationMillis)'

export type DriveListedFile = {
  id: string
  name: string
  mimeType: string
  size?: string
  modifiedTime?: string
  width?: number
  height?: number
  durationMillis?: string
  thumbnailLink?: string
}

type DriveFileResource = {
  id?: string
  name?: string
  mimeType?: string
  size?: string
  modifiedTime?: string
  parents?: string[]
  trashed?: boolean
  thumbnailLink?: string
  imageMediaMetadata?: { width?: number; height?: number }
  videoMediaMetadata?: { width?: number; height?: number; durationMillis?: string }
}

type DriveList = {
  nextPageToken?: string
  files?: DriveFileResource[]
}

type ServiceAccount = {
  client_email: string
  private_key: string
}

const folderIds = new Map<string, Promise<string>>()
let contentHub: Promise<string> | undefined
let jwtClient: JWT | undefined

type MediaAccess = {
  expires: number
  meta: DriveFileResource
}

const mediaAccess = new Map<string, MediaAccess>()
const mediaAccessInflight = new Map<string, Promise<DriveFileResource>>()

type DriveRequest = {
  method?: 'GET' | 'POST'
  body?: string
  headers?: Headers
}

export type DriveCollectionFolder = {
  id: string
  name: string
  modifiedTime?: string
}

export type DrivePlacedFile = DriveListedFile & {
  collectionId: string | null
  collectionName: string | null
}

export async function listContainedMedia(folderId: string): Promise<DriveListedFile[]> {
  if (!isDriveFileId(folderId)) return []
  const files = await listCollectionFiles(folderId)
  return files.flatMap((file) => {
    const listed = toListedFile(file)
    return listed.id ? [listed] : []
  })
}

export async function readContainedFolder(folderId: string): Promise<{ name: string; modifiedTime: string } | null> {
  if (!isDriveFileId(folderId)) return null
  const folder = await getFile(folderId, 'id,name,mimeType,modifiedTime,trashed')
  if (!folder.id || folder.mimeType !== FOLDER_MIME || !folder.name || folder.trashed) return null
  return { name: folder.name, modifiedTime: folder.modifiedTime ?? '' }
}

export async function listFolderMedia(folderId: string): Promise<DriveListedFile[]> {
  const listed = await listClientFolder(folderId)
  return listed.files
}

export async function listClientFolder(folderId: string): Promise<{
  files: DrivePlacedFile[]
  collections: DriveCollectionFolder[]
}> {
  const children = await listChildren(folderId)
  const files: DrivePlacedFile[] = []
  const collectionFolders: DriveFileResource[] = []
  for (const child of children) {
    if (!child.id || !child.name || !child.mimeType) continue
    if (isMediaMime(child.mimeType)) {
      files.push(placeFile(child, null, null))
      continue
    }
    if (child.mimeType !== FOLDER_MIME) continue
    collectionFolders.push(child)
  }

  const nested = await Promise.all(
    collectionFolders.map(async (folder) => ({
      folder,
      files: await listCollectionFiles(folder.id ?? ''),
    })),
  )
  const collections: DriveCollectionFolder[] = []
  for (const entry of nested) {
    const folder = entry.folder
    if (!folder.id || !folder.name) continue
    collections.push({ id: folder.id, name: folder.name, modifiedTime: folder.modifiedTime })
    for (const file of entry.files) files.push(placeFile(file, folder.id, folder.name))
  }

  files.sort((left, right) => (right.modifiedTime ?? '').localeCompare(left.modifiedTime ?? ''))
  collections.sort((left, right) => (right.modifiedTime ?? '').localeCompare(left.modifiedTime ?? ''))
  return { files, collections }
}

export async function readFolderName(folderId: string): Promise<string> {
  if (!isDriveFileId(folderId)) throw new Error('That folder is not available.')
  const folder = await getFile(folderId, 'id,name,mimeType,parents')
  if (!folder.id || folder.mimeType !== FOLDER_MIME || !folder.name) throw new Error('That folder is not available.')
  const parents = folder.parents ?? []
  const hubId = await contentHubId()
  if (parents.includes(hubId)) return folder.name
  const clientsId = await clientsFolderId()
  if (clientsId && parents.includes(clientsId)) return folder.name
  throw new Error('That folder is not available.')
}

export async function legacyFolderId(folder: ClientFolder): Promise<string> {
  return folderIdFor(folder)
}

export async function downloadClientFile(folderId: string, fileId: string): Promise<{
  name: string
  mimeType: string
  body: ReadableStream<Uint8Array>
}> {
  const meta = await requireMediaFile(folderId, fileId)
  const media = await originalMedia(fileId)
  return { name: meta.name ?? 'download', mimeType: meta.mimeType ?? media.mimeType, body: media.body }
}

export async function openClientVideo(
  folderId: string,
  fileId: string,
  range: string | null,
): Promise<{
  name: string
  mimeType: string
  status: number
  body: ReadableStream<Uint8Array>
  contentLength: string | null
  contentRange: string | null
}> {
  const meta = await requireMediaFile(folderId, fileId)
  if (!meta.mimeType?.startsWith('video/')) throw new Error('That file is not available.')
  const headers = new Headers()
  if (range) headers.set('Range', range)
  const response = await driveFetch(`files/${fileId}?alt=media&supportsAllDrives=true`, { headers })
  if (!response.ok || !response.body) throw new Error(`Google Drive request failed (${response.status}).`)
  return {
    name: meta.name ?? 'video',
    mimeType: meta.mimeType,
    status: response.status,
    body: response.body,
    contentLength: response.headers.get('content-length'),
    contentRange: response.headers.get('content-range'),
  }
}

export async function wideClientImage(folderId: string, fileId: string): Promise<{
  mimeType: string
  body: ReadableStream<Uint8Array>
}> {
  const meta = await requireMediaFile(folderId, fileId)
  if (!meta.mimeType?.startsWith('image/')) throw new Error('That file is not available.')
  const wide = await loadThumbnail(meta, WIDE_IMAGE_SIZE, false)
  if (wide) return wide
  const image = await originalMedia(fileId)
  return { mimeType: meta.mimeType, body: image.body }
}

export async function thumbnailClientFile(folderId: string, fileId: string): Promise<{
  mimeType: string
  body: ReadableStream<Uint8Array>
} | null> {
  const meta = await requireMediaFile(folderId, fileId)
  return thumbnailFromMeta(meta)
}

export async function thumbnailForKnownFile(fileId: string): Promise<{
  mimeType: string
  body: ReadableStream<Uint8Array>
} | null> {
  if (!isDriveFileId(fileId)) return null
  const meta = await getFile(fileId, FILE_FIELDS)
  if (!meta.id || !meta.mimeType || meta.mimeType === FOLDER_MIME || !isMediaMime(meta.mimeType)) return null
  return thumbnailFromMeta(meta)
}

export function gridThumbnailFromLink(link: string): Promise<{
  mimeType: string
  body: ReadableStream<Uint8Array>
} | null> {
  return loadThumbnail({ thumbnailLink: link }, GRID_THUMBNAIL_SIZE, true)
}

export function wideThumbnailFromLink(link: string): Promise<{
  mimeType: string
  body: ReadableStream<Uint8Array>
} | null> {
  return loadThumbnail({ thumbnailLink: link }, WIDE_IMAGE_SIZE, false)
}

export async function wideThumbnailForKnownFile(fileId: string): Promise<{
  mimeType: string
  body: ReadableStream<Uint8Array>
} | null> {
  if (!isDriveFileId(fileId)) return null
  const meta = await getFile(fileId, FILE_FIELDS)
  if (!meta.id || !meta.mimeType?.startsWith('image/')) return null
  return loadThumbnail(meta, WIDE_IMAGE_SIZE, false)
}

async function thumbnailFromMeta(meta: DriveFileResource): Promise<{
  mimeType: string
  body: ReadableStream<Uint8Array>
} | null> {
  const thumbnail = await loadThumbnail(meta, GRID_THUMBNAIL_SIZE, true)
  if (thumbnail) return thumbnail
  if (!meta.mimeType?.startsWith('image/') || !meta.id) return null
  try {
    const image = await originalMedia(meta.id)
    return { mimeType: meta.mimeType, body: image.body }
  } catch {
    return null
  }
}

async function loadThumbnail(
  meta: DriveFileResource,
  size: number,
  allowSmaller: boolean,
): Promise<{ mimeType: string; body: ReadableStream<Uint8Array> } | null> {
  if (!meta.thumbnailLink) return null
  const sized = sizedThumbnailUrl(meta.thumbnailLink, size)
  if (sized) {
    const image = await fetchThumbnail(sized)
    if (image) return image
    if (!allowSmaller || sized === meta.thumbnailLink) return null
  }
  if (!allowSmaller) return null
  return fetchThumbnail(meta.thumbnailLink)
}

async function fetchThumbnail(url: string): Promise<{ mimeType: string; body: ReadableStream<Uint8Array> } | null> {
  try {
    const token = await accessToken()
    const thumbnail = await fetch(url, { headers: { Authorization: `Bearer ${token}` } })
    if (!thumbnail.ok || !thumbnail.body) return null
    const mimeType = thumbnail.headers.get('content-type') || 'image/jpeg'
    if (!mimeType.startsWith('image/')) return null
    return { mimeType, body: thumbnail.body }
  } catch {
    return null
  }
}

async function originalMedia(fileId: string): Promise<{ mimeType: string; body: ReadableStream<Uint8Array> }> {
  const response = await driveFetch(`files/${fileId}?alt=media&supportsAllDrives=true`)
  if (!response.ok || !response.body) throw new Error(`Google Drive request failed (${response.status}).`)
  return { mimeType: response.headers.get('content-type') || 'application/octet-stream', body: response.body }
}

function sizedThumbnailUrl(link: string, size: number): string | null {
  if (/=s\d+/.test(link)) return link.replace(/=s\d+/, `=s${size}`)
  if (/[?&]sz=w?\d+/.test(link)) return link.replace(/([?&]sz=)w?\d+/, `$1w${size}`)
  if (/=w\d+(?:-h\d+)?/.test(link)) return link.replace(/=w\d+(?:-h\d+)?/, `=s${size}`)
  if (link.includes('?')) return null
  return `${link}=s${size}`
}

async function requireMediaFile(folderId: string, fileId: string): Promise<DriveFileResource> {
  if (!isDriveFileId(fileId) || !isDriveFileId(folderId)) throw new Error('That file is not available.')
  const key = `${folderId}:${fileId}`
  const cached = mediaAccess.get(key)
  if (cached && cached.expires > Date.now()) return cached.meta
  if (cached) mediaAccess.delete(key)

  const inflight = mediaAccessInflight.get(key)
  if (inflight) return inflight

  const pending = loadMediaFile(folderId, fileId)
    .then((meta) => {
      rememberMediaAccess(key, meta)
      return meta
    })
    .finally(() => {
      mediaAccessInflight.delete(key)
    })
  mediaAccessInflight.set(key, pending)
  return pending
}

async function loadMediaFile(folderId: string, fileId: string): Promise<DriveFileResource> {
  const meta = await getFile(fileId, FILE_FIELDS)
  if (!meta.id || !meta.mimeType || meta.mimeType === FOLDER_MIME || !isMediaMime(meta.mimeType)) {
    throw new Error('That file is not available.')
  }
  const inside = await fileIsInside(meta, folderId)
  if (!inside) throw new Error('That file is not available.')
  return meta
}

function rememberMediaAccess(key: string, meta: DriveFileResource) {
  if (mediaAccess.size >= MEDIA_ACCESS_LIMIT) {
    const oldest = mediaAccess.keys().next().value
    if (oldest) mediaAccess.delete(oldest)
  }
  mediaAccess.set(key, { expires: Date.now() + MEDIA_ACCESS_TTL_MS, meta })
}

async function fileIsInside(file: DriveFileResource, rootId: string): Promise<boolean> {
  const seen = new Set<string>()
  let pending = file.parents ?? []
  for (let depth = 0; depth < 4 && pending.length > 0; depth += 1) {
    if (pending.includes(rootId)) return true
    const ids = pending.filter((parentId) => {
      if (seen.has(parentId)) return false
      seen.add(parentId)
      return true
    })
    if (ids.length === 0) return false
    const parents = await Promise.all(ids.map((parentId) => getFile(parentId, 'id,parents')))
    pending = parents.flatMap((parent) => parent.parents ?? [])
  }
  return false
}

async function listCollectionFiles(folderId: string): Promise<DriveFileResource[]> {
  if (!folderId) return []
  const children = await listChildren(folderId)
  const files: DriveFileResource[] = []
  const nestedFolderIds: string[] = []
  for (const child of children) {
    if (!child.id || !child.name || !child.mimeType) continue
    if (isMediaMime(child.mimeType)) {
      files.push(child)
      continue
    }
    if (child.mimeType !== FOLDER_MIME) continue
    nestedFolderIds.push(child.id)
  }
  const nested = await Promise.all(nestedFolderIds.map((id) => listChildren(id)))
  for (const group of nested) {
    for (const file of group) {
      if (!file.id || !file.name || !file.mimeType || !isMediaMime(file.mimeType)) continue
      files.push(file)
    }
  }
  return files
}

async function listChildren(folderId: string): Promise<DriveFileResource[]> {
  return listQuery(`${quote(folderId)} in parents and trashed = false`, `nextPageToken,files(${FILE_FIELDS})`)
}

function placeFile(file: DriveFileResource, collectionId: string | null, collectionName: string | null): DrivePlacedFile {
  return { ...toListedFile(file), collectionId, collectionName }
}

function toListedFile(file: DriveFileResource): DriveListedFile {
  return {
    id: file.id ?? '',
    name: file.name ?? '',
    mimeType: file.mimeType ?? '',
    size: file.size,
    modifiedTime: file.modifiedTime,
    width: file.imageMediaMetadata?.width ?? file.videoMediaMetadata?.width,
    height: file.imageMediaMetadata?.height ?? file.videoMediaMetadata?.height,
    durationMillis: file.videoMediaMetadata?.durationMillis,
    thumbnailLink: file.thumbnailLink,
  }
}

async function clientsFolderId(): Promise<string | null> {
  const hubId = await contentHubId()
  const children = await listQuery(
    `${quote(hubId)} in parents and name = ${quote(CLIENTS_FOLDER_NAME)} and mimeType = '${FOLDER_MIME}' and trashed = false`,
    'nextPageToken,files(id,name)',
  )
  return children.find((item) => item.id && item.name === CLIENTS_FOLDER_NAME)?.id ?? null
}

async function contentHubId(): Promise<string> {
  contentHub ??= findContentHubId()
  try {
    return await contentHub
  } catch (error) {
    contentHub = undefined
    throw error
  }
}

async function findContentHubId(): Promise<string> {
  const parents = await listQuery(
    `name = ${quote(CONTENT_HUB_NAME)} and mimeType = '${FOLDER_MIME}' and trashed = false`,
    'nextPageToken,files(id,name)',
  )
  const parent = parents.find((item) => item.id && item.name === CONTENT_HUB_NAME)
  if (!parent?.id) throw new Error('The Content Hub folder is not available.')
  return parent.id
}

async function folderIdFor(folder: ClientFolder): Promise<string> {
  const cached = folderIds.get(folder.email)
  if (cached) return cached
  const pending = findFolderId(folder)
  folderIds.set(folder.email, pending)
  try {
    return await pending
  } catch (error) {
    folderIds.delete(folder.email)
    throw error
  }
}

async function findFolderId(folder: ClientFolder): Promise<string> {
  const parents = await listQuery(
    `name = ${quote(folder.parentName)} and mimeType = '${FOLDER_MIME}' and trashed = false`,
    'nextPageToken,files(id,name)',
  )
  for (const parent of parents) {
    if (!parent.id) continue
    const children = await listQuery(
      `${quote(parent.id)} in parents and mimeType = '${FOLDER_MIME}' and trashed = false`,
      'nextPageToken,files(id,name)',
    )
    const child = children.find((item) => sameFolderName(item.name, folder.folderName))
    if (child?.id) return child.id
  }

  const folders = await listQuery(
    `mimeType = '${FOLDER_MIME}' and trashed = false`,
    'nextPageToken,files(id,name,parents)',
  )
  const named = folders.filter((item) => item.id && sameFolderName(item.name, folder.folderName))
  for (const candidate of named) {
    const parentId = candidate.parents?.[0]
    if (!candidate.id || !parentId) continue
    const parent = folders.find((item) => item.id === parentId) ?? (await getFile(parentId, 'id,name,mimeType'))
    if (sameFolderName(parent.name, folder.parentName)) return candidate.id
  }
  if (named.length === 1 && named[0]?.id) return named[0].id
  throw new Error(`The ${folder.folderName} folder is not available.`)
}

function sameFolderName(left: string | undefined, right: string): boolean {
  return normalizeFolderName(left ?? '') === normalizeFolderName(right)
}

function normalizeFolderName(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

async function listQuery(query: string, fields: string): Promise<DriveFileResource[]> {
  const files: DriveFileResource[] = []
  let pageToken = ''
  do {
    const params = new URLSearchParams({
      q: query,
      fields,
      pageSize: '100',
      supportsAllDrives: 'true',
      includeItemsFromAllDrives: 'true',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const body = await driveJson<DriveList>(`files?${params.toString()}`)
    files.push(...(body.files ?? []))
    pageToken = body.nextPageToken ?? ''
  } while (pageToken)
  return files
}

async function getFile(fileId: string, fields: string): Promise<DriveFileResource> {
  const params = new URLSearchParams({ fields, supportsAllDrives: 'true' })
  return driveJson<DriveFileResource>(`files/${fileId}?${params.toString()}`)
}

async function driveJson<T>(path: string, request?: DriveRequest): Promise<T> {
  const response = await driveFetch(path, request)
  if (!response.ok) throw new Error(await driveError(response))
  return (await response.json()) as T
}

async function driveFetch(path: string, request?: DriveRequest): Promise<Response> {
  const token = await accessToken()
  const headers = new Headers({ Authorization: `Bearer ${token}` })
  request?.headers?.forEach((value, key) => {
    if (key.toLowerCase() === 'authorization') return
    headers.set(key, value)
  })
  if (request?.body) headers.set('Content-Type', 'application/json')
  return fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    method: request?.method ?? 'GET',
    headers,
    body: request?.body,
  })
}

async function accessToken(): Promise<string> {
  const client = driveClient()
  const access = await client.getAccessToken()
  if (!access.token) throw new Error('Google Drive credentials are not configured.')
  return access.token
}

function driveClient(): JWT {
  if (jwtClient) return jwtClient
  const credentials = readCredentials()
  jwtClient = new JWT({
    email: credentials.client_email,
    key: credentials.private_key,
    scopes: [DRIVE_SCOPE],
  })
  return jwtClient
}

function readCredentials(): ServiceAccount {
  const inline = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  if (inline) {
    const parsed = parseServiceAccount(inline)
    if (!parsed) throw new Error('Google Drive credentials are not configured.')
    return parsed
  }
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  if (!keyFile) throw new Error('Google Drive credentials are not configured.')
  let raw: string
  try {
    raw = readFileSync(keyFile, 'utf8')
  } catch {
    throw new Error('Google Drive credentials are not configured.')
  }
  const parsed = parseServiceAccount(raw)
  if (!parsed) throw new Error('Google Drive credentials are not configured.')
  return parsed
}

function parseServiceAccount(raw: string): ServiceAccount | null {
  try {
    const parsed: unknown = JSON.parse(raw)
    return isServiceAccount(parsed) ? parsed : null
  } catch {
    return null
  }
}

function isServiceAccount(value: unknown): value is ServiceAccount {
  if (!value || typeof value !== 'object') return false
  const record = value as Record<string, unknown>
  return typeof record.client_email === 'string' && typeof record.private_key === 'string' && record.private_key.length > 0
}

async function driveError(response: Response): Promise<string> {
  const fallback = `Google Drive request failed (${response.status}).`
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    const message = body.error?.message
    if (!message || message.length > 240) return fallback
    if (message.includes('PRIVATE') || message.includes('BEGIN')) return fallback
    return message
  } catch {
    return fallback
  }
}

function quote(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}

function isMediaMime(mimeType: string): boolean {
  return mimeType.startsWith('image/') || mimeType.startsWith('video/')
}

export function isDriveFileId(fileId: string): boolean {
  return /^[a-zA-Z0-9_-]{10,}$/.test(fileId)
}

export async function readDirectChildFolder(
  parentId: string,
  childId: string,
): Promise<{ id: string; name: string } | null> {
  if (!isDriveFileId(parentId) || !isDriveFileId(childId)) return null
  const folder = await getFile(childId, 'id,name,mimeType,parents')
  if (!folder.id || !folder.name || folder.mimeType !== FOLDER_MIME) return null
  if (!(folder.parents ?? []).includes(parentId)) return null
  return { id: folder.id, name: folder.name }
}
