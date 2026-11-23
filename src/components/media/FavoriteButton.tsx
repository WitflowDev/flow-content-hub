'use client'

import { Icon } from '@/components/icons'
import { useFavorites } from '@/state/Favorites'

export function FavoriteButton({ fileId, placement = 'thumb' }: { fileId: string; placement?: 'thumb' | 'inline' }) {
  const favorites = useFavorites()
  const on = favorites.ids.includes(fileId)

  return (
    <button
      type="button"
      className={on ? `favorite-btn ${placement} on` : `favorite-btn ${placement}`}
      data-favorite=""
      aria-pressed={on}
      aria-label={on ? 'Remove from favorites' : 'Add to favorites'}
      disabled={favorites.pending === fileId}
      onClick={(event) => {
        event.stopPropagation()
        favorites.toggle(fileId)
      }}
    >
      <Icon name="star" filled={on} />
    </button>
  )
}
