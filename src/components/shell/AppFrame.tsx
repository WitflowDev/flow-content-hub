'use client'

import type { ReactNode } from 'react'
import { Shell } from '@/components/shell/Shell'
import type { Collection, MediaItem } from '@/data/types'
import type { AccountNotice } from '@/lib/notifications/types'
import { CatalogProvider } from '@/state/Catalog'
import { NotificationsProvider } from '@/state/Notifications'
import { SessionProvider, type SessionProfile } from '@/state/Session'

export function AppFrame({
  profile,
  notices,
  media,
  collections,
  children,
}: {
  profile: SessionProfile
  notices: AccountNotice[]
  media: MediaItem[]
  collections: Collection[]
  children: ReactNode
}) {
  return (
    <SessionProvider profile={profile}>
      <CatalogProvider media={media} collections={collections}>
        <NotificationsProvider notices={notices}>
          <Shell>{children}</Shell>
        </NotificationsProvider>
      </CatalogProvider>
    </SessionProvider>
  )
}
