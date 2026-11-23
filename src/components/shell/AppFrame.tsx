'use client'

import type { ReactNode } from 'react'
import { LibraryPrefetch } from '@/components/media/LibraryPrefetch'
import { Shell } from '@/components/shell/Shell'
import type { Collection, MediaItem } from '@/data/types'
import type { AccountNotice } from '@/lib/notifications/types'
import { CatalogProvider } from '@/state/Catalog'
import { FavoritesProvider } from '@/state/Favorites'
import { NotificationsProvider } from '@/state/Notifications'
import { SessionProvider, type SessionProfile } from '@/state/Session'

export function AppFrame({
  profile,
  notices,
  media,
  collections,
  favoriteFileIds,
  children,
}: {
  profile: SessionProfile
  notices: AccountNotice[]
  media: MediaItem[]
  collections: Collection[]
  favoriteFileIds: string[]
  children: ReactNode
}) {
  return (
    <SessionProvider profile={profile}>
      <CatalogProvider media={media} collections={collections}>
        <FavoritesProvider fileIds={favoriteFileIds}>
          <LibraryPrefetch />
          <NotificationsProvider notices={notices}>
            <Shell>{children}</Shell>
          </NotificationsProvider>
        </FavoritesProvider>
      </CatalogProvider>
    </SessionProvider>
  )
}
