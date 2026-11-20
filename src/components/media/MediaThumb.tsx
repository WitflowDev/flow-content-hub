import type { MediaItem } from '@/data/types'

export function MediaThumb({ item, eager = false }: { item: MediaItem; eager?: boolean }) {
  return (
    <img
      src={item.src}
      alt={item.title}
      loading={eager ? 'eager' : 'lazy'}
      decoding="async"
      style={{ objectPosition: item.position || '50% 50%' }}
    />
  )
}
