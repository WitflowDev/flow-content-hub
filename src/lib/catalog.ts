import 'server-only'
import type { Collection } from '@/data/types'
import type { DocumentReference } from 'firebase-admin/firestore'
import { adminDb } from '@/lib/firebase/admin'

type CollectionRow = Collection & {
  sortOrder: number
  profileId: string
}

export async function loadAccountCollections(userId: string): Promise<Collection[]> {
  const db = adminDb()
  const userRef = db.collection('users').doc(userId)
  const [byUid, byReference] = await Promise.all([
    db.collection('collections').where('profileId', '==', userId).orderBy('sortOrder').get(),
    db.collection('collections').where('profileId', '==', userRef).orderBy('sortOrder').get(),
  ])
  return uniqueCollections([...byUid.docs, ...byReference.docs].map((item) => mapCollection(item.id, item.data())))
}

export async function loadClientCollections(): Promise<Collection[]> {
  const snap = await adminDb().collection('collections').where('profileId', '!=', null).get()
  return uniqueCollections(snap.docs.map((item) => mapCollection(item.id, item.data()))).filter((item) => item.profileId)
}

function uniqueCollections(rows: CollectionRow[]): CollectionRow[] {
  const bySlug = new Map<string, CollectionRow>()
  for (const row of rows) bySlug.set(row.slug, row)
  return [...bySlug.values()].sort((a, b) => a.sortOrder - b.sortOrder)
}

function mapCollection(slug: string, row: Record<string, unknown>): CollectionRow {
  return {
    slug,
    title: text(row.title),
    count: typeof row.count === 'number' ? row.count : 0,
    date: text(row.date),
    description: text(row.description),
    ids: textList(row.ids),
    cover: textList(row.cover),
    published: row.published === true,
    sortOrder: typeof row.sortOrder === 'number' ? row.sortOrder : 0,
    profileId: profileIdOf(row.profileId),
  }
}

function profileIdOf(value: unknown): string {
  if (typeof value === 'string') return value.replace(/^users\//, '')
  if (isReference(value)) return value.id
  return ''
}

function isReference(value: unknown): value is DocumentReference {
  return Boolean(value && typeof value === 'object' && 'path' in value && 'id' in value)
}

function text(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function textList(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is string => typeof item === 'string')
}
