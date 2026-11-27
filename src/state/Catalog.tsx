'use client'

import { createContext, useContext, useMemo } from 'react'
import type { ReactNode } from 'react'
import type { ChannelFilter, Collection, ContentTypeFilter, MediaItem, SortMode } from '@/data/types'
import { filteredMedia, findCollection, type ArchiveFormat } from '@/lib/library'

type CatalogValue = {
  media: MediaItem[]
  collections: Collection[]
  mediaById: Map<string, MediaItem>
  preparing: boolean
}

const CatalogContext = createContext<CatalogValue | null>(null)

export function CatalogProvider({
  media,
  collections,
  preparing = false,
  children,
}: {
  media: MediaItem[]
  collections: Collection[]
  preparing?: boolean
  children: ReactNode
}) {
  const value = useMemo<CatalogValue>(() => {
    const mediaById = new Map(media.map((item) => [item.id, item]))
    return { media, collections, mediaById, preparing }
  }, [media, collections, preparing])
  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useLibrary() {
  const catalog = useContext(CatalogContext)
  if (!catalog) throw new Error('useLibrary must be used within CatalogProvider')
  const { media, collections, mediaById, preparing } = catalog

  return useMemo(() => {
    const itemsFor = (collection: Collection) =>
      collection.ids.flatMap((id) => {
        const item = mediaById.get(id)
        return item ? [item] : []
      })

    return {
      media,
      collections,
      preparing,
      getMedia: (id: string) => mediaById.get(id) ?? null,
      getCollection: (slug: string) => findCollection(collections, slug),
      filteredMedia: (options: {
        search: string
        contentType: ContentTypeFilter
        channel: ChannelFilter
        sort: SortMode
        year?: string
        collection?: string
        format?: ArchiveFormat
      }) => filteredMedia(media, options),
      collectionItems: itemsFor,
      collectionGridItems: itemsFor,
    }
  }, [media, collections, mediaById, preparing])
}
