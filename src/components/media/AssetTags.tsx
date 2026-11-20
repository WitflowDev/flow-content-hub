import { mediaTags, tagClass } from '@/lib/library'
import type { MediaItem } from '@/data/types'

export function AssetTags({ item }: { item: MediaItem }) {
  const tags = mediaTags(item)
  if (!item.collection && tags.length === 0) return null
  return (
    <div className="asset-tag-row">
      {item.collection ? (
        <span className="tag collection">
          <small>Collection</small>
          {item.collection}
        </span>
      ) : null}
      {tags.map((tag) => {
        const tone = tagClass(tag)
        return (
          <span key={tag} className={tone ? `tag ${tone}` : 'tag'}>
            {tag}
          </span>
        )
      })}
    </div>
  )
}
