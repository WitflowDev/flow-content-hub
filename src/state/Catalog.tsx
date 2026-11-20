'use client'

import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { ChannelFilter, Collection, ContentTypeFilter, MediaItem, SortMode } from '@/data/types'
import { filteredMedia, findCollection } from '@/lib/library'

type CatalogValue = {
  media: MediaItem[]
  collections: Collection[]
  mediaById: Map<string, MediaItem>
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({
  media,
  collections,
  children,
}: {
  media: MediaItem[]
  collections: Collection[]
  children: ReactNode
}) {
  const value = useMemo<CatalogValue>(() => {
    const mediaById = new Map(media.map((item) => [item.id, item]))
    return { media, collections, mediaById }
  }, [media, collections])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useLibrary() {
  const catalog = useContext(CatalogContext)
  if (!catalog) throw new Error('useLibrary must be used within CatalogProvider')
  const { media, collections, mediaById } = catalog

  return useMemo(() => {
    const itemsFor = (collection: Collection) =>
      collection.ids.flatMap((id) => {
        const item = mediaById.get(id)
        return item ? [item] : []
      })

    return {
      media,
      collections,
      getMedia: (id: string) => mediaById.get(id) ?? null,
      getCollection: (slug: string) => findCollection(collections, slug),
      filteredMedia: (options: {
        search: string
        contentType: ContentTypeFilter
        channel: ChannelFilter
        sort: SortMode
      }) => filteredMedia(media, options),
      collectionItems: itemsFor,
      collectionGridItems: itemsFor,
    }
  }, [media, collections, mediaById])
}
