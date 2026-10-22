'use client'

import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { ChannelFilter, Collection, ContentTypeFilter, MediaItem, SortMode } from '@/data/types'
import { collectionGridItems, collectionItems, filteredMedia, findCollection, findMedia } from '@/lib/library'

type CatalogValue = {
  media: MediaItem[]
  collections: Collection[]
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({
  media,
  collections,
  children,
}: CatalogValue & { children: ReactNode }) {
  const value = useMemo(() => ({ media, collections }), [media, collections])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useLibrary() {
  const catalog = useContext(CatalogContext)
  if (!catalog) throw new Error('useLibrary must be used within CatalogProvider')
  const { media, collections } = catalog

  return {
    media,
    collections,
    getMedia: (id: string) => findMedia(media, id),
    getCollection: (slug: string) => findCollection(collections, slug),
    filteredMedia: (options: {
      search: string
      contentType: ContentTypeFilter
      channel: ChannelFilter
      sort: SortMode
    }) => filteredMedia(media, options),
    collectionItems: (collection: Collection) => collectionItems(media, collection),
    collectionGridItems: (collection: Collection) => collectionGridItems(media, collection),
  }
}
