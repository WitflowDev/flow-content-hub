'use client'

import { Icon } from '@/components/icons'
import { useFavorites } from '@/state/Favorites'
import { useSession } from '@/state/Session'

export function FavoriteButton({ fileId, placement = 'thumb' }: { fileId: string; placement?: 'thumb' | 'inline' }) {
  const favorites = useFavorites()
  const preview = useSession().preview
  const on = favorites.ids.includes(fileId)
  const placementClass = placement === 'inline' ? 'inline' : ''
  const className = ['favorite-btn', placementClass, on ? 'on' : ''].filter(Boolean).join(' ')

  return (
    <button
      type="button"
      className={className}
      data-favorite=""
      aria-pressed={on}
      aria-label={on ? 'Remove from favorites' : 'Add to favorites'}
      disabled={preview || favorites.pending === fileId}
      onClick={(event) => {
        event.stopPropagation()
        if (preview) return
        favorites.toggle(fileId)
      }}
    >
      <Icon name="star" filled={on} />
    </button>
  )
}
