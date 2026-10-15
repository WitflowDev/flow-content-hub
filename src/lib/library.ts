import { collections } from '@/data/collections'
import { media } from '@/data/media'
import type { ChannelFilter, Collection, ContentTypeFilter, MediaItem, SortMode } from '@/data/types'

export function getMedia(id: string): MediaItem {
  const found = media.find((item) => item.id === id)
  if (found) return found
  const fallback = media[0]
  if (!fallback) throw new Error('Media library is empty')
  return fallback
}

export function getCollection(slug: string): Collection {
  const found = collections.find((item) => item.slug === slug)
  if (found) return found
  const fallback = collections[0]
  if (!fallback) throw new Error('No collections are available')
  return fallback
}

export function tagClass(channel: string): string {
  switch (channel) {
    case 'Website':
      return 'blue'
    case 'Ads':
      return 'orange'
    case 'Design':
      return 'green'
    default:
      return ''
  }
}

export function filteredMedia(options: {
  search: string
  contentType: ContentTypeFilter
  channel: ChannelFilter
  sort: SortMode
}): MediaItem[] {
  const query = options.search.toLowerCase().trim()
  let results = [...media]
  if (query) {
    results = results.filter((item) =>
      [item.title, item.collection, item.channel, item.type].join(' ').toLowerCase().includes(query),
    )
  }
  if (options.contentType !== 'All') {
    results = results.filter((item) => item.type === options.contentType)
  }
  if (options.channel !== 'All') {
    results = results.filter((item) => item.channel === options.channel)
  }
  if (options.sort === 'A\u2013Z') {
    results.sort((left, right) => left.title.localeCompare(right.title))
  }
  return results
}

export function collectionItems(collection: Collection): MediaItem[] {
  return collection.ids.map((id) => getMedia(id))
}

export function collectionGridItems(collection: Collection): MediaItem[] {
  const items = collectionItems(collection)
  const extras = media.filter((item) => !items.includes(item)).slice(0, Math.max(0, 8 - items.length))
  return items.concat(extras)
}

export function assetFormat(orientation: MediaItem['orientation']): string {
  if (orientation === 'Vertical') return '1080 \u00d7 1920 (9:16)'
  if (orientation === 'Square') return '1080 \u00d7 1080 (1:1)'
  return '1920 \u00d7 1080 (16:9)'
}

export function routeParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? ''
  return value ?? ''
}
