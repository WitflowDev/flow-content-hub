import type { Collection, MediaChannel, MediaItem, MediaType, Orientation } from '@/data/types'
import { createClient } from '@/lib/supabase/server'

type AssetRow = {
  id: string
  title: string
  type: string
  file: string
  size: string
  duration: string | null
  src: string
  channel: string
  orientation: string
  collection: string
  position: string
  description: string
  drive_file_id: string | null
}

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

export async function loadCatalog(): Promise<{ media: MediaItem[]; collections: Collection[] }> {
  const supabase = await createClient()
  const [assets, collections] = await Promise.all([
    supabase.from('assets').select('*').order('sort_order'),
    supabase.from('collections').select('*').order('sort_order'),
  ])

  if (assets.error) throw new Error(assets.error.message)
  if (collections.error) throw new Error(collections.error.message)

  return {
    media: (assets.data as AssetRow[]).map(mapAsset),
    collections: (collections.data as CollectionRow[]).map(mapCollection),
  }
}

function mapAsset(row: AssetRow): MediaItem {
  return {
    id: row.id,
    title: row.title,
    type: mediaType(row.type),
    file: row.file,
    size: row.size,
    duration: row.duration ?? undefined,
    src: row.src,
    channel: mediaChannel(row.channel),
    orientation: orientation(row.orientation),
    collection: row.collection,
    position: row.position,
    description: row.description,
    driveFileId: row.drive_file_id,
  }
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

function mediaType(value: string): MediaType {
  if (value === 'Video' || value === 'Photography' || value === 'Design') return value
  throw new Error(`Unexpected asset type: ${value}`)
}

function mediaChannel(value: string): MediaChannel {
  if (value === 'Instagram' || value === 'Website' || value === 'Ads' || value === 'Design') return value
  throw new Error(`Unexpected asset channel: ${value}`)
}

function orientation(value: string): Orientation {
  if (value === 'Vertical' || value === 'Portrait' || value === 'Landscape' || value === 'Square') return value
  throw new Error(`Unexpected asset orientation: ${value}`)
}
