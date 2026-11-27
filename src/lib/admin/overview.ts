import 'server-only'
import { after } from 'next/server'
import type { Timestamp } from 'firebase-admin/firestore'
import { formatVariantId } from '@/data/exports'
import type { AdminAccount, AdminCollectionRow, ServiceRequestRow, ServiceRequestStatus } from '@/lib/admin/types'
import { isServiceRequestStatus } from '@/lib/admin/types'
import { parseRole } from '@/lib/auth'
import { isDriveFileId, listClientFolder, type DrivePlacedFile } from '@/lib/drive/client'
import { readCollectionRecords } from '@/lib/drive/publish'
import { adminDb } from '@/lib/firebase/admin'
import { drainJob } from '@/lib/jobs/loop'
import { enqueueJob } from '@/lib/jobs/queue'
import { readLibraryIndex, type StoredLibrary } from '@/lib/library-index/store'
import { reportError } from '@/lib/observe'

const DRIVE_FALLBACK_CONCURRENCY = 4

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
    const email = text(account.get('email'))
    const name = text(account.get('name'))
    const companyName = text(account.get('companyName'))
    return {
      id: account.id,
      email,
      name,
      companyName,
      label: accountLabel(companyName, name, email, account.id),
      hasFolder: typeof driveFolderId === 'string' && driveFolderId.length > 0,
      role: parseRole(account.get('role')),
      driveFolderId: typeof driveFolderId === 'string' ? driveFolderId : '',
    }
  })

  const clientsWithFolders = accounts.filter((account) => account.role === 'client' && account.hasFolder)
  const indexedReads = await Promise.all(
    clientsWithFolders.map(async (account) => ({
      account,
      indexed: await readLibraryIndex(account.driveFolderId).catch(() => null),
    })),
  )

  const missingIndex = indexedReads.filter((entry) => entry.indexed === null)
  const fallbackListed = new Map<string, Awaited<ReturnType<typeof listClientFolder>> | null>()
  if (missingIndex.length > 0) {
    let cursor = 0
    const workers = Array.from({ length: Math.min(DRIVE_FALLBACK_CONCURRENCY, missingIndex.length) }, async () => {
      while (cursor < missingIndex.length) {
        const current = cursor
        cursor += 1
        const target = missingIndex[current]
        if (!target) continue
        try {
          const listed = await listClientFolder(target.account.driveFolderId)
          fallbackListed.set(target.account.id, listed)
          const jobId = await enqueueJob({
            kind: 'sync-library',
            folderId: target.account.driveFolderId,
            uid: target.account.id,
          })
          scheduleDrain(jobId)
        } catch (error) {
          reportError('drive.list', error instanceof Error ? error : 'A client folder could not be listed.')
          fallbackListed.set(target.account.id, null)
        }
      }
    })
    await Promise.all(workers)
  }

  const allCollectionIds: string[] = []
  for (const entry of indexedReads) {
    if (entry.indexed) {
      for (const col of entry.indexed.snapshot.collections) allCollectionIds.push(col.slug)
    } else {
      const listed = fallbackListed.get(entry.account.id)
      if (listed) {
        for (const col of listed.collections) allCollectionIds.push(col.id)
      }
    }
  }
  const records = await readCollectionRecords(allCollectionIds)

  let publishedAssets = 0
  let draftCollections = 0
  const collections: AdminCollectionRow[] = []

  for (const entry of indexedReads) {
    if (entry.indexed) {
      const summary = summarizeIndexed(entry.account, entry.indexed, records)
      publishedAssets += summary.publishedAssets
      draftCollections += summary.draftCollections
      collections.push(...summary.collections)
      continue
    }

    const listed = fallbackListed.get(entry.account.id)
    if (!listed) continue
    const draftIds = new Set(
      listed.collections
        .filter((collection) => records.get(collection.id)?.published === false)
        .map((collection) => collection.id),
    )
    draftCollections += draftIds.size
    for (const file of listed.files) {
      if (formatVariantId(file.name)) continue
      if (!file.collectionId || !draftIds.has(file.collectionId)) publishedAssets += 1
    }
    for (const collection of listed.collections) {
      const members = listed.files.filter((file) => file.collectionId === collection.id && !formatVariantId(file.name))
      const record = records.get(collection.id)
      const chosen = record?.coverFileId ? members.find((file) => file.id === record.coverFileId) : undefined
      const cover = chosen ?? newestFile(members)
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

function summarizeIndexed(
  account: { id: string; label: string; driveFolderId: string },
  stored: StoredLibrary,
  records: Awaited<ReturnType<typeof readCollectionRecords>>,
): { publishedAssets: number; draftCollections: number; collections: AdminCollectionRow[] } {
  const { items, collections: indexedCollections } = stored.snapshot
  const itemById = new Map(items.map((item) => [item.id, item]))
  const draftIds = new Set<string>()
  const draftTitles = new Set<string>()

  for (const col of indexedCollections) {
    const record = records.get(col.slug)
    const published = record ? record.published : col.published !== false
    if (!published) {
      draftIds.add(col.slug)
      draftTitles.add(col.title)
    }
  }

  let publishedAssets = 0
  for (const item of items) {
    const isDraft =
      item.collectionId !== undefined
        ? item.collectionId !== '' && draftIds.has(item.collectionId)
        : item.collection !== '' && draftTitles.has(item.collection)
    if (!isDraft) publishedAssets += 1
  }

  const rows: AdminCollectionRow[] = indexedCollections.map((col) => {
    const record = records.get(col.slug)
    const published = record ? record.published : col.published !== false
    const chosenId = record?.coverFileId ? `drive-${record.coverFileId}` : col.cover[0] ?? col.ids[0] ?? ''
    const coverItem = itemById.get(chosenId) ?? (col.ids[0] ? itemById.get(col.ids[0]) : undefined)
    return {
      id: col.slug,
      title: col.title,
      count: col.count,
      published,
      accountId: account.id,
      accountLabel: account.label,
      clientFolderId: account.driveFolderId,
      coverFileId: coverItem?.driveFileId ?? null,
      coverVideo: coverItem?.type === 'Video',
      description: record?.description ?? col.description ?? '',
      tags: record?.tags ?? col.tags ?? [],
    }
  })

  return { publishedAssets, draftCollections: draftIds.size, collections: rows }
}

function scheduleDrain(jobId: string): void {
  try {
    after(() => drainJob(jobId))
  } catch {
    // Ignore outside request lifecycle.
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
