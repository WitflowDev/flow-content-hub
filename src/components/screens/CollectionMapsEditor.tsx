'use client'

import { InstagramCarousel } from '@/components/collections/InstagramCarousel'
import type { MediaItem } from '@/data/types'
import type { AdminPost } from '@/lib/admin/types'

export type DraftCarousel = {
  id: string
  description: string
  fileIds: string[]
}

const MAP_LIMIT = 12
const SLIDE_LIMIT = 10

export function adminPostMedia(post: AdminPost, clientFolderId: string): MediaItem {
  return {
    id: post.id,
    title: post.title,
    type: post.video ? 'Video' : 'Photography',
    file: post.title,
    size: '',
    src: `/api/admin/files/${post.id}/thumbnail?folder=${encodeURIComponent(clientFolderId)}`,
    channel: '',
    orientation: 'Square',
    collection: '',
    position: '50% 50%',
    description: post.description,
    driveFileId: post.id,
  }
}

export function CollectionMapsEditor({
  posts,
  clientFolderId,
  maps,
  disabled,
  onChange,
}: {
  posts: AdminPost[]
  clientFolderId: string
  maps: DraftCarousel[]
  disabled: boolean
  onChange: (maps: DraftCarousel[]) => void
}) {
  const media = new Map(posts.map((post) => [post.id, adminPostMedia(post, clientFolderId)]))

  function toggle(mapId: string, fileId: string) {
    onChange(
      maps.map((map) => {
        if (map.id !== mapId) return map
        if (map.fileIds.includes(fileId)) return { ...map, fileIds: map.fileIds.filter((id) => id !== fileId) }
        if (map.fileIds.length >= SLIDE_LIMIT) return map
        return { ...map, fileIds: [...map.fileIds, fileId] }
      }),
    )
  }

  return (
    <div className="upload-maps">
      <div className="upload-maps-head">
        <div>
          <b>Carousels</b>
          <small>Build them from the photos already in this collection. Click a photo to add or remove it.</small>
        </div>
        <button
          type="button"
          className="btn ghost"
          disabled={disabled || maps.length >= MAP_LIMIT || posts.length < 2}
          onClick={() => onChange([...maps, { id: crypto.randomUUID(), description: '', fileIds: [] }])}
        >
          Add a carousel
        </button>
      </div>
      {maps.map((map, mapIndex) => {
        const slides = map.fileIds.map((id) => media.get(id)).filter((item): item is MediaItem => Boolean(item))
        return (
          <div className="upload-map" key={map.id}>
            <div className="upload-map-head">
              <span>Carousel {mapIndex + 1}</span>
              <button type="button" className="text-btn" disabled={disabled} onClick={() => onChange(maps.filter((item) => item.id !== map.id))}>
                Remove
              </button>
            </div>
            <label className="upload-map-caption">
              <span>Carousel suggestion</span>
              <textarea
                value={map.description}
                disabled={disabled}
                maxLength={500}
                placeholder="Optional. How this carousel should be used."
                onChange={(event) =>
                  onChange(maps.map((item) => (item.id === map.id ? { ...item, description: event.target.value } : item)))
                }
              />
            </label>
            <div className="upload-map-files">
              {posts.map((post) => {
                const place = map.fileIds.indexOf(post.id)
                return (
                  <button
                    key={`${map.id}-${post.id}`}
                    type="button"
                    className={place >= 0 ? 'upload-map-file on' : 'upload-map-file'}
                    disabled={disabled}
                    onClick={() => toggle(map.id, post.id)}
                  >
                    <img src={`/api/admin/files/${post.id}/thumbnail?folder=${encodeURIComponent(clientFolderId)}`} alt="" />
                    {place >= 0 ? <b>{place + 1}</b> : null}
                  </button>
                )
              })}
            </div>
            {slides.length >= 2 ? (
              <InstagramCarousel
                title="Preview"
                description={map.description}
                items={slides}
              />
            ) : (
              <small className="upload-map-hint">Select at least two files.</small>
            )}
          </div>
        )
      })}
    </div>
  )
}
