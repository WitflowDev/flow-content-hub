import type { Collection, MediaItem } from '@/data/types'

export const FAVORITES_SLUG = 'favorites'
const FAVORITE_LIMIT = 200

export function favoritesCollection(items: MediaItem[], fileIds: string[]): Collection {
  const wanted = new Set(fileIds)
  const members = items.filter((item) => item.driveFileId && wanted.has(item.driveFileId))
  return {
    slug: FAVORITES_SLUG,
    title: 'Favorites',
    count: members.length,
    date: '',
    description: 'Assets you starred.',
    ids: members.map((item) => item.id),
    cover: members.slice(0, 1).map((item) => item.id),
    published: true,
    favorites: true,
  }
}

export function favoriteLimit(): number {
  return FAVORITE_LIMIT
}
