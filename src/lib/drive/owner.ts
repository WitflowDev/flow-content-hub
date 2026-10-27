import 'server-only'
import { OAuth2Client } from 'google-auth-library'

const OWNER_EMAIL = 'geral.productionsflow@gmail.com'
const DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive'
const CONTENT_HUB_NAME = 'Content Hub'
const FOLDER_MIME = 'application/vnd.google-apps.folder'

type DriveFile = {
  id?: string
  name?: string
  parents?: string[]
  owners?: { emailAddress?: string }[]
}

type DriveList = {
  nextPageToken?: string
  files?: DriveFile[]
}

type DriveRequest = {
  method?: 'GET' | 'POST'
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

export async function createClientDriveFolder(companyName: string): Promise<{ id: string; name: string }> {
  const base = companyFolderName(companyName)
  if (!base) throw new Error('Enter a company name.')
  const parentId = await contentHubId()
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
  return { id: created.id, name: created.name || name }
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
