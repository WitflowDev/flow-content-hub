'use client'

import type { ReactNode } from 'react'
import { Shell } from '@/components/shell/Shell'
import type { Collection, MediaItem } from '@/data/types'
import { CatalogProvider } from '@/state/Catalog'
import { SessionProvider, type SessionProfile } from '@/state/Session'

export function AppFrame({
  profile,
  media,
  collections,
  children,
}: {
  profile: SessionProfile
  media: MediaItem[]
  collections: Collection[]
  children: ReactNode
}) {
  return (
    <SessionProvider profile={profile}>
      <CatalogProvider media={media} collections={collections}>
        <Shell>{children}</Shell>
      </CatalogProvider>
    </SessionProvider>
  )
}
