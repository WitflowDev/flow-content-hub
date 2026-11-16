import 'server-only'
import { OAuth2Client } from 'google-auth-library'

const OWNER_EMAIL = 'geral.productionsflow@gmail.com'
const READER_EMAIL = 'content-hub-drive@flow-content-hub.iam.gserviceaccount.com'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const CONTENT_HUB_NAME = 'Content Hub'
const CLIENTS_FOLDER_NAME = 'Clients'
const LIBRARY_FOLDER_NAME = 'Library'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

type DriveFile = {
  id?: string
  name?: string
  mimeType?: string
  parents?: string[]
  owners?: { emailAddress?: string }[]
}

type DriveList = {
  nextPageToken?: string
  files?: DriveFile[]
}

type DriveRequest = {
  method?: 'GET' | 'POST' | 'PATCH'
  body?: string
}

let cachedClient: OAuth2Client | undefined
let cachedContentHub: Promise<string> | undefined

export function ownerAccessConfigured(): boolean {
  return Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET && process.env.GOOGLE_OAUTH_REFRESH_TOKEN)
}

export function companyFolderName(companyName: string): string | null {
  const cleaned = companyName.replace(/[\\/\u0000-\u001F\u007F]/g, '').trim()
  if (!cleaned || cleaned === '.' || cleaned === '..') return null
  return cleaned
}

const MAX_MEDIA_BYTES = 80 * 1024 * 1024

export async function publishMediaToFolders(
  folderIds: string[],
  file: { name: string; mimeType: string; bytes: Uint8Array },
): Promise<string[]> {
  const folders = [...new Set(folderIds.filter(Boolean))]
  if (folders.length === 0) throw new Error('Choose at least one client.')
  if (!file.mimeType.startsWith('image/') && !file.mimeType.startsWith('video/')) {
    throw new Error('Upload a photo or a video.')
  }
  if (file.bytes.byteLength === 0) throw new Error('That file is empty.')
  if (file.bytes.byteLength > MAX_MEDIA_BYTES) throw new Error('Each file must be 80 MB or smaller.')

  await ensureHubReader()
  for (const folderId of folders) await placeUnderClients(folderId)
  const sourceId = await uploadOwnerFile(await libraryFolderId(), file)
  const saved: string[] = []
  try {
    for (const folderId of folders) saved.push(await copyOwnerFile(sourceId, folderId, file.name))
  } catch (error) {
    if (saved.length === 0) await trashFile(sourceId)
    throw error
  }
  return saved
}

async function uploadOwnerFile(
  folderId: string,
  file: { name: string; mimeType: string; bytes: Uint8Array },
): Promise<string> {
  const boundary = `flow${crypto.randomUUID().replaceAll('-', '')}`
  const metadata = JSON.stringify({ name: file.name, mimeType: file.mimeType, parents: [folderId] })
  const body = Buffer.concat([
    Buffer.from(`--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n${metadata}\r\n`),
    Buffer.from(`--${boundary}\r\nContent-Type: ${file.mimeType}\r\n\r\n`),
    Buffer.from(file.bytes),
    Buffer.from(`\r\n--${boundary}--`),
  ])
  const token = await accessToken()
  const response = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&supportsAllDrives=true&fields=id,parents',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    },
  )
  if (!response.ok) throw new Error(await driveError(response))
  const created = (await response.json()) as DriveFile
  if (!created.id || !(created.parents ?? []).includes(folderId)) {
    throw new Error('The file could not be saved in the client folder.')
  }
  return created.id
}

async function copyOwnerFile(sourceId: string, folderId: string, name: string): Promise<string> {
  const copied = await ownerJson<DriveFile>(
    `files/${sourceId}/copy?supportsAllDrives=true&fields=id,parents`,
    {
      method: 'POST',
      body: JSON.stringify({ name, parents: [folderId] }),
    },
  )
  if (!copied.id || !(copied.parents ?? []).includes(folderId)) {
    throw new Error('The file could not be saved in every selected client folder.')
  }
  return copied.id
}

export async function createClientDriveFolder(companyName: string): Promise<{ id: string; name: string }> {
  const base = companyFolderName(companyName)
  if (!base) throw new Error('Enter a company name.')
  const parentId = await clientsFolderId()
  const name = await nextFolderName(parentId, base)
  const created = await ownerJson<DriveFile>('files?fields=id,name,parents,owners(emailAddress)', {
    method: 'POST',
    body: JSON.stringify({
      name,
      mimeType: FOLDER_MIME,
      parents: [parentId],
    }),
  })
  const ownedByAccount = (created.owners ?? []).some((owner) => owner.emailAddress === OWNER_EMAIL)
  if (!created.id || !(created.parents ?? []).includes(parentId) || !ownedByAccount) {
    throw new Error('The client folder could not be created inside Content Hub.')
  }
  await ensureHubReader()
  return { id: created.id, name: created.name || name }
}

async function placeUnderClients(folderId: string): Promise<void> {
  const clientsId = await clientsFolderId()
  const folder = await ownerJson<DriveFile & { trashed?: boolean }>(
    `files/${folderId}?supportsAllDrives=true&fields=id,name,mimeType,parents,trashed`,
  )
  if (folder.trashed || folder.mimeType !== FOLDER_MIME || !folder.id) {
    throw new Error('The client folder is not available.')
  }
  if (folder.name === CONTENT_HUB_NAME || folder.name === CLIENTS_FOLDER_NAME || folder.name === LIBRARY_FOLDER_NAME) {
    throw new Error('The client folder is not available.')
  }
  const parents = folder.parents ?? []
  if (parents.includes(clientsId)) return
  const params = new URLSearchParams({
    addParents: clientsId,
    supportsAllDrives: 'true',
    fields: 'id,parents',
  })
  if (parents.length > 0) params.set('removeParents', parents.join(','))
  const moved = await ownerJson<DriveFile>(`files/${folderId}?${params}`, { method: 'PATCH' })
  if (!(moved.parents ?? []).includes(clientsId)) {
    throw new Error('The client folder could not be placed in Content Hub.')
  }
}

async function ensureHubReader(): Promise<void> {
  const hubId = await contentHubId()
  const response = await ownerFetch(
    `files/${hubId}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
    {
      method: 'POST',
      body: JSON.stringify({ type: 'user', role: 'reader', emailAddress: readerEmail() }),
    },
  )
  if (response.ok) return
  const message = await driveError(response)
  if (/already exists|duplicate/i.test(message)) return
  throw new Error('Google Drive could not share Content Hub with the content library.')
}

function readerEmail(): string {
  const raw = process.env.GOOGLE_SERVICE_ACCOUNT_JSON?.trim()
  if (!raw) return READER_EMAIL
  try {
    const parsed = JSON.parse(raw) as { client_email?: unknown }
    if (typeof parsed.client_email === 'string' && parsed.client_email.includes('@')) return parsed.client_email
  } catch {
    return READER_EMAIL
  }
  return READER_EMAIL
}

async function trashFile(fileId: string): Promise<void> {
  await ownerJson(`files/${fileId}?supportsAllDrives=true`, {
    method: 'PATCH',
    body: JSON.stringify({ trashed: true }),
  })
}

async function nextFolderName(parentId: string, base: string): Promise<string> {
  const children = await listFolders(`${quote(parentId)} in parents and mimeType = '${FOLDER_MIME}' and trashed = false`)
  const taken = new Set(children.map((child) => normalizeFolderName(child.name ?? '')))
  if (!taken.has(normalizeFolderName(base))) return base
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base}-${suffix}`
    if (!taken.has(normalizeFolderName(candidate))) return candidate
  }
  throw new Error('The client folder could not be created.')
}

async function clientsFolderId(): Promise<string> {
  return childFolderId(await contentHubId(), CLIENTS_FOLDER_NAME)
}

async function libraryFolderId(): Promise<string> {
  return childFolderId(await contentHubId(), LIBRARY_FOLDER_NAME)
}

async function childFolderId(parentId: string, name: string): Promise<string> {
  const existing = await listFolders(
    `${quote(parentId)} in parents and name = ${quote(name)} and mimeType = '${FOLDER_MIME}' and trashed = false`,
  )
  const match = existing.find((folder) => folder.id && folder.name === name)
  if (match?.id) return match.id
  const created = await ownerJson<DriveFile>('files?fields=id,name,parents', {
    method: 'POST',
    body: JSON.stringify({ name, mimeType: FOLDER_MIME, parents: [parentId] }),
  })
  if (!created.id || !(created.parents ?? []).includes(parentId)) {
    throw new Error('The Content Hub folder is not available.')
  }
  return created.id
}

async function contentHubId(): Promise<string> {
  cachedContentHub ??= findContentHubId()
  try {
    return await cachedContentHub
  } catch (error) {
    cachedContentHub = undefined
    throw error
  }
}

async function findContentHubId(): Promise<string> {
  const folders = await listFolders(
    `name = ${quote(CONTENT_HUB_NAME)} and mimeType = '${FOLDER_MIME}' and trashed = false and 'me' in owners`,
  )
  const matches = folders.filter((folder) => folder.id && folder.name === CONTENT_HUB_NAME)
  if (matches.length === 1 && matches[0]?.id) return matches[0].id
  if (matches.length > 1) {
    throw new Error('More than one Content Hub folder belongs to this Google account, so no client folder was created.')
  }
  throw new Error('The Content Hub folder is not available.')
}

async function listFolders(query: string): Promise<DriveFile[]> {
  const files: DriveFile[] = []
  let pageToken = ''
  do {
    const params = new URLSearchParams({
      q: query,
      fields: 'nextPageToken,files(id,name)',
      pageSize: '100',
      corpora: 'user',
      spaces: 'drive',
    })
    if (pageToken) params.set('pageToken', pageToken)
    const body = await ownerJson<DriveList>(`files?${params.toString()}`)
    files.push(...(body.files ?? []))
    pageToken = body.nextPageToken ?? ''
  } while (pageToken)
  return files
}

function normalizeFolderName(value: string): string {
  return value.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
}

async function ownerJson<T>(path: string, request?: DriveRequest): Promise<T> {
  const response = await ownerFetch(path, request)
  if (!response.ok) throw new Error(await driveError(response))
  return (await response.json()) as T
}

async function ownerFetch(path: string, request?: DriveRequest): Promise<Response> {
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
  try {
    const access = await ownerClient().getAccessToken()
    if (!access.token) throw new Error('Google Drive owner access is not configured.')
    return access.token
  } catch (error) {
    throw publicError(error, 'Google Drive owner access is not configured.')
  }
}

function ownerClient(): OAuth2Client {
  if (cachedClient) return cachedClient
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  const refreshToken = process.env.GOOGLE_OAUTH_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) throw new Error('Google Drive owner access is not configured.')
  const client = new OAuth2Client({ clientId, clientSecret })
  client.setCredentials({ refresh_token: refreshToken, scope: DRIVE_SCOPE })
  cachedClient = client
  return client
}

async function driveError(response: Response): Promise<string> {
  const fallback = `Google Drive request failed (${response.status}).`
  try {
    const body = (await response.json()) as { error?: { message?: string } }
    return publicError(new Error(body.error?.message ?? ''), fallback).message
  } catch {
    return fallback
  }
}

function publicError(error: unknown, fallback: string): Error {
  const message = error instanceof Error ? error.message : ''
  if (!message || message.length > 240) return new Error(fallback)
  if (/PRIVATE|BEGIN|ya29\.|refresh_token|client_secret/i.test(message)) return new Error(fallback)
  return error instanceof Error && error.message === message ? error : new Error(message)
}

function quote(value: string): string {
  return `'${value.replaceAll('\\', '\\\\').replaceAll("'", "\\'")}'`
}
