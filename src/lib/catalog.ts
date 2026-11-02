import type { Collection } from '@/data/types'
import { createClient } from '@/lib/supabase/server'

type CollectionRow = {
  slug: string
  title: string
  count: number
  date: string
  description: string
  ids: string[]
  cover: string[]
  published: boolean
}

export async function loadAccountCollections(userId: string): Promise<Collection[]> {
  const supabase = await createClient()
  const collections = await supabase.from('collections').select('*').eq('profile_id', userId).order('sort_order')
  if (collections.error) throw new Error(collections.error.message)
  return (collections.data as CollectionRow[]).map(mapCollection)
}

export async function loadClientCollections(): Promise<Collection[]> {
  const supabase = await createClient()
  const collections = await supabase.from('collections').select('*').not('profile_id', 'is', null).order('sort_order')
  if (collections.error) throw new Error(collections.error.message)
  return (collections.data as CollectionRow[]).map(mapCollection)
}

function mapCollection(row: CollectionRow): Collection {
  return {
    slug: row.slug,
    title: row.title,
    count: row.count,
    date: row.date,
    description: row.description,
    ids: row.ids,
    cover: row.cover,
    published: row.published,
  }
}
