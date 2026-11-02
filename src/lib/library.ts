import type { ChannelFilter, Collection, ContentTypeFilter, MediaItem, SortMode } from '@/data/types'

export function findMedia(media: MediaItem[], id: string): MediaItem | null {
  return media.find((item) => item.id === id) ?? null
}

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
    results = results.filter((item) => hasDriveFile(item) || item.channel === options.channel)
  }
  if (options.sort === 'A\u2013Z') {
    results.sort((left, right) => left.title.localeCompare(right.title))
  }
  return results
}

function hasDriveFile(item: MediaItem): boolean {
  return typeof item.driveFileId === 'string' && item.driveFileId.length > 0
}

export function collectionItems(media: MediaItem[], collection: Collection): MediaItem[] {
  return collection.ids.flatMap((id) => {
    const item = findMedia(media, id)
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
