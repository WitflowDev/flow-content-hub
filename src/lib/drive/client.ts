import 'server-only'
import { readFileSync } from 'node:fs'
import { JWT } from 'google-auth-library'
import type { ClientFolder } from './access'

const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const CONTENT_HUB_NAME = 'Content Hub'
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
}

type DriveFileResource = {
  id?: string
  name?: string
  mimeType?: string
  size?: string
  modifiedTime?: string
  parents?: string[]
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

type DriveRequest = {
  method?: 'GET' | 'POST'
  body?: string
}

export async function listFolderMedia(folderId: string): Promise<DriveListedFile[]> {
  const files = await listMedia(folderId, 2)
  files.sort((left, right) => (right.modifiedTime ?? '').localeCompare(left.modifiedTime ?? ''))
  return files
}

export async function readFolderName(folderId: string): Promise<string> {
  if (!isDriveFileId(folderId)) throw new Error('That folder is not available.')
  const folder = await getFile(folderId, 'id,name,mimeType,parents')
  if (!folder.id || folder.mimeType !== FOLDER_MIME || !folder.name) throw new Error('That folder is not available.')
  const parentId = await contentHubId()
  if (!(folder.parents ?? []).includes(parentId)) throw new Error('That folder is not available.')
  return folder.name
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
  const response = await driveFetch(`files/${fileId}?alt=media&supportsAllDrives=true`)
  if (!response.ok || !response.body) throw new Error(`Google Drive request failed (${response.status}).`)
  return { name: meta.name ?? 'download', mimeType: meta.mimeType ?? 'application/octet-stream', body: response.body }
}

export async function thumbnailClientFile(folderId: string, fileId: string): Promise<{
  mimeType: string
  body: ReadableStream<Uint8Array>
} | null> {
  const meta = await requireMediaFile(folderId, fileId)
  if (meta.thumbnailLink) {
    const token = await accessToken()
    const thumbnail = await fetch(meta.thumbnailLink, { headers: { Authorization: `Bearer ${token}` } })
    if (thumbnail.ok && thumbnail.body) {
      return { mimeType: thumbnail.headers.get('content-type') || 'image/jpeg', body: thumbnail.body }
    }
  }
  if (meta.mimeType?.startsWith('image/')) {
    const image = await driveFetch(`files/${fileId}?alt=media&supportsAllDrives=true`)
    if (image.ok && image.body) return { mimeType: meta.mimeType, body: image.body }
  }
  return null
}

async function requireMediaFile(folderId: string, fileId: string): Promise<DriveFileResource> {
  if (!isDriveFileId(fileId) || !isDriveFileId(folderId)) throw new Error('That file is not available.')
  const meta = await getFile(fileId, FILE_FIELDS)
  if (!meta.id || !meta.mimeType || meta.mimeType === FOLDER_MIME || !isMediaMime(meta.mimeType)) {
    throw new Error('That file is not available.')
  }
  const inside = await fileIsInside(meta, folderId)
  if (!inside) throw new Error('That file is not available.')
  return meta
}

async function fileIsInside(file: DriveFileResource, rootId: string): Promise<boolean> {
  const seen = new Set<string>()
  let pending = file.parents ?? []
  for (let depth = 0; depth < 4 && pending.length > 0; depth += 1) {
    const next: string[] = []
    for (const parentId of pending) {
      if (parentId === rootId) return true
      if (seen.has(parentId)) continue
      seen.add(parentId)
      const parent = await getFile(parentId, 'id,parents')
      next.push(...(parent.parents ?? []))
    }
    pending = next
  }
  return false
}

async function listMedia(folderId: string, depth: number): Promise<DriveListedFile[]> {
  const children = await listQuery(`${quote(folderId)} in parents and trashed = false`, `nextPageToken,files(${FILE_FIELDS})`)
  const media: DriveListedFile[] = []
  for (const child of children) {
    if (!child.id || !child.name || !child.mimeType) continue
    if (isMediaMime(child.mimeType)) {
      media.push(toListedFile(child))
      continue
    }
    if (child.mimeType === FOLDER_MIME && depth > 0) {
      media.push(...(await listMedia(child.id, depth - 1)))
    }
  }
  return media
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
  }
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
  const keyFile = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH
  if (!keyFile) throw new Error('Google Drive credentials are not configured.')
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(keyFile, 'utf8'))
  } catch {
    throw new Error('Google Drive credentials are not configured.')
  }
  if (!isServiceAccount(parsed)) throw new Error('Google Drive credentials are not configured.')
  return parsed
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

function isDriveFileId(fileId: string): boolean {
  return /^[a-zA-Z0-9_-]{10,}$/.test(fileId)
}
