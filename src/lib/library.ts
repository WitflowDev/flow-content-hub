import type { ChannelFilter, Collection, ContentTypeFilter, MediaItem, SortMode } from '@/data/types'

export function findCollection(collections: Collection[], slug: string): Collection | null {
  return collections.find((item) => item.slug === slug) ?? null
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

export function mediaTags(item: MediaItem): string[] {
  if (Array.isArray(item.tags)) return item.tags
  if (item.driveFileId) return []
  return item.channel ? [item.channel] : []
}

export function filteredMedia(
  media: MediaItem[],
  options: {
    search: string
    contentType: ContentTypeFilter
    channel: ChannelFilter
    sort: SortMode
  },
): MediaItem[] {
  const query = options.search.toLowerCase().trim()
  let results = media
  if (query) {
    results = results.filter((item) =>
      [item.title, item.collection, item.type, ...mediaTags(item)].join(' ').toLowerCase().includes(query),
    )
  }
  if (options.contentType !== 'All') {
    results = results.filter((item) => item.type === options.contentType)
  }
  if (options.channel !== 'All') {
    const wanted = options.channel.toLowerCase()
    results = results.filter((item) => mediaTags(item).some((tag) => tag.toLowerCase() === wanted))
  }
  if (options.sort === 'A\u2013Z') {
    return [...results].sort((left, right) => left.title.localeCompare(right.title))
  }
  return results
}

export function collectionItems(media: MediaItem[], collection: Collection): MediaItem[] {
  const mediaById = new Map(media.map((item) => [item.id, item]))
  return collection.ids.flatMap((id) => {
    const item = mediaById.get(id)
    return item ? [item] : []
  })
}

export function collectionGridItems(media: MediaItem[], collection: Collection): MediaItem[] {
  return collectionItems(media, collection)
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
