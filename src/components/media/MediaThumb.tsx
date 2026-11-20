import { VideoStill } from '@/components/media/VideoStill'
import type { MediaItem } from '@/data/types'

export function MediaThumb({
  item,
  eager = false,
  videoSrc,
}: {
  item: MediaItem
  eager?: boolean
  videoSrc?: string
}) {
  if (item.type === 'Video' && (videoSrc || item.driveFileId)) {
    return <VideoStill src={videoSrc || `/api/drive/files/${item.driveFileId}/stream`} alt={item.title} />
  }
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
