import { createRequire } from 'node:module'
import { OAuth2Client } from 'google-auth-library'

const require = createRequire(import.meta.url)
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())

const HUB_ID = '15UZDA7IVi0d4quooTm0I_4OeTvDsx7yR'
const OLD_HUB_ID = '1KNH6VrV97OPHBe1ryXMGGI6FrCkWFNEi'
const TEST_FILE_ID = '1lULYu36x_rhHJiguYlGx6lUnKpdTWxLN'
const SERVICE_ACCOUNT = 'content-hub-drive@flow-content-hub.iam.gserviceaccount.com'
const FOLDER = 'application/vnd.google-apps.folder'

const oauth = new OAuth2Client({
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
})
const stored = process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? ''
oauth.setCredentials({ refresh_token: stored.startsWith('"') ? JSON.parse(stored) : stored })
const token = (await oauth.getAccessToken()).token
if (!token) throw new Error('missing token')

const clientsId = await ensureFolder(HUB_ID, 'Clients')
const libraryId = await ensureFolder(HUB_ID, 'Library')
console.log('clients_ready=true')
console.log('library_ready=true')

const oldChildren = await list(`'${OLD_HUB_ID}' in parents and trashed = false`)
for (const child of oldChildren) {
  if (child.mimeType !== FOLDER) continue
  await move(child.id, clientsId, OLD_HUB_ID)
  console.log(`moved_client=${child.name}`)
}
await move(TEST_FILE_ID, libraryId, 'root')
console.log('moved_test_file=true')

const remaining = await list(`'${OLD_HUB_ID}' in parents and trashed = false`)
if (remaining.length === 0) {
  await patch(OLD_HUB_ID, { trashed: true })
  console.log('old_hub_trashed=true')
} else {
  console.log(`old_hub_remaining=${remaining.length}`)
}

const shared = await fetch(
  `https://www.googleapis.com/drive/v3/files/${HUB_ID}/permissions?supportsAllDrives=true&sendNotificationEmail=false`,
  {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ role: 'reader', type: 'user', emailAddress: SERVICE_ACCOUNT }),
  },
)
const shareBody = await shared.json()
console.log(`service_account_share=${shared.ok ? 'reader' : shareBody.error?.message ?? shared.status}`)

const tree = await list(`'${HUB_ID}' in parents and trashed = false`)
for (const item of tree) {
  console.log(`hub/${item.name}`)
  if (item.mimeType !== FOLDER) continue
  const nested = await list(`'${item.id}' in parents and trashed = false`)
  for (const child of nested) console.log(`  ${item.name}/${child.name}`)
}

async function ensureFolder(parentId, name) {
  const existing = await list(
    `'${parentId}' in parents and name = '${name}' and mimeType = '${FOLDER}' and trashed = false`,
  )
  if (existing[0]?.id) return existing[0].id
  const created = await drive(`files?fields=id,parents`, {
    method: 'POST',
    body: { name, mimeType: FOLDER, parents: [parentId] },
  })
  if (!created.id) throw new Error(`could not create ${name}`)
  return created.id
}

async function move(fileId, addParent, removeParent) {
  const params = new URLSearchParams({
    addParents: addParent,
    removeParents: removeParent,
    supportsAllDrives: 'true',
    fields: 'id,parents',
  })
  const moved = await drive(`files/${fileId}?${params}`, { method: 'PATCH', body: {} })
  if (!(moved.parents ?? []).includes(addParent)) throw new Error(`could not move ${fileId}`)
}

async function patch(fileId, body) {
  await drive(`files/${fileId}?supportsAllDrives=true`, { method: 'PATCH', body })
}

async function list(query) {
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,mimeType,parents)',
    pageSize: '100',
    corpora: 'user',
    spaces: 'drive',
  })
  const body = await drive(`files?${params}`)
  return body.files ?? []
}

async function drive(path, request) {
  const response = await fetch(`https://www.googleapis.com/drive/v3/${path}`, {
    method: request?.method ?? 'GET',
    headers: {
      Authorization: `Bearer ${token}`,
      ...(request?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: request?.body ? JSON.stringify(request.body) : undefined,
  })
  const body = await response.json().catch(() => ({}))
  if (!response.ok && request?.method !== 'POST') throw new Error(body.error?.message ?? `drive ${response.status}`)
  return body
}
