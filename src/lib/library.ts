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

export type SearchCloseness = 'exact' | 'half' | 'quarter'

export const ARCHIVE_FORMATS = ['All', 'Post', 'Story', 'Banner'] as const
export type ArchiveFormat = (typeof ARCHIVE_FORMATS)[number]

export function filteredMedia(
  media: MediaItem[],
  options: {
    search: string
    contentType: ContentTypeFilter
    channel: ChannelFilter
    sort: SortMode
    year?: string
    collection?: string
    format?: ArchiveFormat
  },
): { items: MediaItem[]; closeness: SearchCloseness } {
  let pool = media
  if (options.contentType !== 'All') {
    pool = pool.filter((item) => item.type === options.contentType)
  }
  if (options.year && options.year !== 'All') {
    const year = Number(options.year)
    pool = pool.filter((item) => item.year === year)
  }
  if (options.collection && options.collection !== 'All') {
    pool = pool.filter((item) => item.collection === options.collection)
  }
  const format = options.format ?? 'All'
  if (format !== 'All') pool = pool.filter((item) => formatMatches(item, format))
  if (options.channel !== 'All') {
    const wanted = options.channel.toLowerCase()
    pool = pool.filter((item) => mediaTags(item).some((tag) => tag.toLowerCase() === wanted))
  }
  const query = options.search.toLowerCase().trim()
  let closeness: SearchCloseness = 'exact'
  let results = pool
  if (query) {
    const exact = pool.filter((item) => searchText(item).includes(query))
    if (exact.length > 0) {
      results = exact
    } else {
      const scored = pool.map((item) => ({ item, score: textScore(query, item) }))
      const half = scored.filter((entry) => entry.score >= 0.5)
      const loose = half.length > 0 ? half : scored.filter((entry) => entry.score >= 0.25)
      closeness = half.length > 0 ? 'half' : 'quarter'
      results = loose.sort((left, right) => right.score - left.score).map((entry) => entry.item)
    }
  }
  if (options.sort === 'A\u2013Z') {
    results = [...results].sort((left, right) => left.title.localeCompare(right.title))
  }
  return { items: results, closeness }
}

function searchText(item: MediaItem): string {
  return [item.title, item.collection, item.type, item.description, item.credit, item.year ? String(item.year) : '', ...mediaTags(item)]
    .join(' ')
    .toLowerCase()
}

function formatMatches(item: MediaItem, format: ArchiveFormat): boolean {
  const formats = item.exports ?? []
  switch (format) {
    case 'All':
      return true
    case 'Post':
      return formats.includes('instagram-post')
    case 'Story':
      return formats.includes('story')
    case 'Banner':
      return formats.includes('facebook-banner')
    default: {
      const unexpected: never = format
      return unexpected
    }
  }
}

function textScore(query: string, item: MediaItem): number {
  const words = query.split(/[^a-z0-9]+/).filter((word) => word.length > 0)
  const tokens = searchText(item)
    .split(/[^a-z0-9]+/)
    .filter((token) => token.length > 0)
  if (words.length === 0 || tokens.length === 0) return 0
  let total = 0
  for (const word of words) {
    let best = 0
    for (const token of tokens) {
      best = Math.max(best, tokenScore(word, token))
      if (best === 1) break
    }
    total += best
  }
  return total / words.length
}

function tokenScore(word: string, token: string): number {
  if (word === token) return 1
  const longest = Math.max(word.length, token.length)
  if (token.includes(word) || word.includes(token)) return Math.min(word.length, token.length) / longest
  if (Math.abs(word.length - token.length) > Math.ceil(word.length * 0.6)) return 0
  return 1 - editDistance(word, token) / longest
}

function editDistance(left: string, right: string): number {
  const previous = Array.from({ length: right.length + 1 }, (_, index) => index)
  const current = Array.from({ length: right.length + 1 }, () => 0)
  for (let row = 1; row <= left.length; row += 1) {
    current[0] = row
    for (let column = 1; column <= right.length; column += 1) {
      const cost = left[row - 1] === right[column - 1] ? 0 : 1
      current[column] = Math.min(current[column - 1] + 1, previous[column] + 1, previous[column - 1] + cost)
    }
    for (let column = 0; column <= right.length; column += 1) previous[column] = current[column]
  }
  return previous[right.length]
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
