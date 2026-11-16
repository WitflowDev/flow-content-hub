import { createRequire } from 'node:module'
import { OAuth2Client } from 'google-auth-library'

const require = createRequire(import.meta.url)
const { loadEnvConfig } = require('@next/env')
loadEnvConfig(process.cwd())

const oauth = new OAuth2Client({
  clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
  clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
})
const stored = process.env.GOOGLE_OAUTH_REFRESH_TOKEN ?? ''
oauth.setCredentials({ refresh_token: stored.startsWith('"') ? JSON.parse(stored) : stored })
const token = (await oauth.getAccessToken()).token
if (!token) throw new Error('missing token')

const hubs = await list("name = 'Content Hub' and mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'me' in owners")
console.log(`hubs=${hubs.length}`)
for (const hub of hubs) {
  console.log(`hub ${hub.id} ${hub.name}`)
  const children = await list(`'${hub.id}' in parents and trashed = false`)
  for (const child of children) {
    console.log(`  ${child.mimeType === 'application/vnd.google-apps.folder' ? 'dir' : 'file'} ${child.id} ${child.name}`)
  }
}

for (const id of ['1KNH6VrV97OPHBe1ryXMGGI6FrCkWFNEi']) {
  const children = await list(`'${id}' in parents and trashed = false`)
  for (const child of children) {
    const nested = await list(`'${child.id}' in parents and trashed = false`)
    const folders = nested.filter((item) => item.mimeType === 'application/vnd.google-apps.folder').length
    const files = nested.length - folders
    console.log(`client ${child.name} folders=${folders} files=${files}`)
  }
}
for (const id of ['1J_k6NXQe1UWbZC-Pyh-L9INCo583Jz5_']) {
  const children = await list(`'${id}' in parents and trashed = false`)
  console.log(`inside ${id} count=${children.length}`)
  for (const child of children) console.log(`  ${child.mimeType === 'application/vnd.google-apps.folder' ? 'dir' : 'file'} ${child.name}`)
}
const named = await list(
  "mimeType = 'application/vnd.google-apps.folder' and trashed = false and 'me' in owners and (name contains 'Witflow' or name contains 'Test' or name = 'Clients' or name = 'Library')",
)
for (const item of named) console.log(`named dir ${item.id} ${item.name} parents=${(item.parents ?? []).join(',')}`)
const root = await list("'root' in parents and trashed = false and (name contains 'flow-content-hub' or mimeType = 'application/vnd.google-apps.folder')")
for (const item of root) console.log(`root ${item.mimeType === 'application/vnd.google-apps.folder' ? 'dir' : 'file'} ${item.id} ${item.name}`)

async function list(query) {
  const params = new URLSearchParams({
    q: query,
    fields: 'files(id,name,mimeType,parents)',
    pageSize: '100',
    corpora: 'user',
    spaces: 'drive',
  })
  const response = await fetch(`https://www.googleapis.com/drive/v3/files?${params}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  const body = await response.json()
  if (!response.ok) throw new Error(body.error?.message ?? `drive ${response.status}`)
  return body.files ?? []
}
