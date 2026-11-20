import 'server-only'
import type { Timestamp } from 'firebase-admin/firestore'
import type { AdminAccount, AdminCollectionRow, ServiceRequestRow, ServiceRequestStatus } from '@/lib/admin/types'
import { isServiceRequestStatus } from '@/lib/admin/types'
import { parseRole } from '@/lib/auth'
import { isDriveFileId, listClientFolder, type DrivePlacedFile } from '@/lib/drive/client'
import { readCollectionRecords } from '@/lib/drive/publish'
import { adminDb } from '@/lib/firebase/admin'

export type AdminOverview = {
  clientCount: number
  publishedAssets: number
  draftCollections: number
  openRequests: number
  accounts: AdminAccount[]
  collections: AdminCollectionRow[]
  requests: ServiceRequestRow[]
}

export async function loadAdminOverview(): Promise<AdminOverview> {
  const db = adminDb()
  const [users, requestSnap, openRequests] = await Promise.all([
    db.collection('users').orderBy('email').get(),
    db.collection('requests').orderBy('createdAt', 'desc').limit(30).get(),
    db.collection('requests').where('status', 'in', ['new', 'open']).count().get(),
  ])

  const accounts = users.docs.map((account) => {
    const driveFolderId = account.get('driveFolderId')
    return {
      id: account.id,
      label: accountLabel(account.get('companyName'), account.get('name'), account.get('email'), account.id),
      hasFolder: typeof driveFolderId === 'string' && driveFolderId.length > 0,
      role: parseRole(account.get('role')),
      driveFolderId: typeof driveFolderId === 'string' ? driveFolderId : '',
    }
  })

  const libraries = await Promise.all(
    accounts
      .filter((account) => account.role === 'client' && account.hasFolder)
      .map(async (account) => {
        try {
          return { account, listed: await listClientFolder(account.driveFolderId) }
        } catch (error) {
          console.error(error instanceof Error ? error.message : 'A client folder could not be listed.')
          return { account, listed: null }
        }
      }),
  )

  const folderIds = libraries.flatMap((entry) => entry.listed?.collections.map((collection) => collection.id) ?? [])
  const records = await readCollectionRecords(folderIds)
  let publishedAssets = 0
  let draftCollections = 0
  const collections: AdminCollectionRow[] = []

  for (const entry of libraries) {
    if (!entry.listed) continue
    const draftIds = new Set(
      entry.listed.collections.filter((collection) => records.get(collection.id)?.published === false).map((collection) => collection.id),
    )
    draftCollections += draftIds.size
    for (const file of entry.listed.files) {
      if (!file.collectionId || !draftIds.has(file.collectionId)) publishedAssets += 1
    }
    for (const collection of entry.listed.collections) {
      const members = entry.listed.files.filter((file) => file.collectionId === collection.id)
      const record = records.get(collection.id)
      const cover = newestFile(members)
      collections.push({
        id: collection.id,
        title: collection.name,
        count: members.length,
        published: record ? record.published : true,
        accountId: entry.account.id,
        accountLabel: entry.account.label,
        clientFolderId: entry.account.driveFolderId,
        coverFileId: cover?.id ?? null,
        coverVideo: cover?.mimeType.startsWith('video/') ?? false,
        description: record?.description ?? '',
        tags: record?.tags ?? [],
      })
    }
  }

  return {
    clientCount: accounts.filter((account) => account.role === 'client').length,
    publishedAssets,
    draftCollections,
    openRequests: openRequests.data().count,
    accounts: accounts.map((account) => ({
      id: account.id,
      label: account.label,
      hasFolder: account.hasFolder,
      role: account.role,
    })),
    collections,
    requests: requestSnap.docs
      .flatMap((item) => {
        const row = mapRequest(item.id, item.data())
        return row ? [row] : []
      })
      .sort((left, right) => requestStatusRank(left.status) - requestStatusRank(right.status)),
  }
}

function newestFile(files: DrivePlacedFile[]): DrivePlacedFile | null {
  const sorted = [...files].sort((left, right) => (right.modifiedTime ?? '').localeCompare(left.modifiedTime ?? ''))
  return sorted[0] ?? null
}

function mapRequest(id: string, data: Record<string, unknown>): ServiceRequestRow | null {
  const service = text(data.service)
  const message = text(data.message)
  const status = text(data.status)
  if (!service || !message || !isServiceRequestStatus(status)) return null
  const name = text(data.name)
  const companyName = text(data.companyName)
  const email = text(data.email)
  const who = companyName || name || email || 'Client'
  return {
    id,
    service,
    message,
    phone: text(data.phone),
    assetTitle: text(data.assetTitle),
    assetHref: requestAssetHref(text(data.assetFileId), text(data.assetFolderId)),
    person: initials(name, email),
    meta: `${who} · ${relativeTime(toDate(data.createdAt))}`,
    status,
  }
}

function requestAssetHref(fileId: string, folderId: string): string {
  if (!fileId || !folderId || !isDriveFileId(fileId) || !isDriveFileId(folderId)) return ''
  return `/admin/asset/${fileId}?folder=${folderId}`
}

function accountLabel(companyName: unknown, name: unknown, email: unknown, id: string): string {
  return text(companyName).trim() || text(name).trim() || text(email).trim() || id
}

function initials(name: string, email: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const first = parts[0]
  const second = parts[1]
  if (first && second) return `${first[0] ?? ''}${second[0] ?? ''}`.toUpperCase()
  if (first && first.length >= 2) return first.slice(0, 2).toUpperCase()
  const local = email.split('@')[0] ?? ''
  return (local.slice(0, 2) || 'FL').toUpperCase()
}

function relativeTime(date: Date | null): string {
  if (!date) return 'Just now'
  const minutes = Math.max(0, Math.round((Date.now() - date.getTime()) / 60000))
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes} min ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.round(hours / 24)
  if (days === 1) return 'Yesterday'
  return `${days}d ago`
}

function toDate(value: unknown): Date | null {
  if (value && typeof value === 'object' && 'toDate' in value && typeof (value as Timestamp).toDate === 'function') {
    return (value as Timestamp).toDate()
  }
  return null
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

export function requestStatusRank(status: ServiceRequestStatus): number {
  switch (status) {
    case 'new':
      return 0
    case 'open':
      return 1
    case 'done':
      return 2
    default: {
      const unexpected: never = status
      return unexpected
    }
  }
}
