'use client'

import { useEffect, useState } from 'react'

export type DraftMap = {
  id: string
  order: number[]
  description: string
}

const MAP_LIMIT = 8
const SLIDE_LIMIT = 10

export function UploadMaps({
  files,
  maps,
  onChange,
}: {
  files: File[]
  maps: DraftMap[]
  onChange: (maps: DraftMap[]) => void
}) {
  const [previews, setPreviews] = useState<Array<{ name: string; url: string; video: boolean }>>([])

  useEffect(() => {
    const next = files.map((file) => ({ name: file.name, url: URL.createObjectURL(file), video: file.type.startsWith('video/') }))
    setPreviews(next)
    return () => {
      for (const preview of next) URL.revokeObjectURL(preview.url)
    }
  }, [files])

  function toggle(mapId: string, index: number) {
    onChange(
      maps.map((map) => {
        if (map.id !== mapId) return map
        if (map.order.includes(index)) return { ...map, order: map.order.filter((item) => item !== index) }
        if (map.order.length >= SLIDE_LIMIT) return map
        return { ...map, order: [...map.order, index] }
      }),
    )
  }

  return (
    <div className="upload-maps">
      <div className="upload-maps-head">
        <div>
          <b>Mini content maps</b>
          <small>Optional. Each map becomes an Instagram-style carousel, in the order you select the files.</small>
        </div>
        <button
          type="button"
          className="btn ghost"
          disabled={maps.length >= MAP_LIMIT}
          onClick={() => onChange([...maps, { id: crypto.randomUUID(), order: [], description: '' }])}
        >
          Add a map
        </button>
      </div>
      {maps.map((map, mapIndex) => (
        <div className="upload-map" key={map.id}>
          <div className="upload-map-head">
            <span>Carousel {mapIndex + 1}</span>
            <button type="button" className="text-btn" onClick={() => onChange(maps.filter((item) => item.id !== map.id))}>
              Remove
            </button>
          </div>
          <label className="upload-map-caption">
            <span>Carousel suggestion</span>
            <textarea
              value={map.description}
              maxLength={500}
              placeholder="Optional. How this carousel should be used."
              onChange={(event) =>
                onChange(maps.map((item) => (item.id === map.id ? { ...item, description: event.target.value } : item)))
              }
            />
          </label>
          <div className="upload-map-files">
            {previews.map((preview, index) => {
              const place = map.order.indexOf(index)
              return (
                <button
                  key={`${map.id}-${preview.name}-${index}`}
                  type="button"
                  className={place >= 0 ? 'upload-map-file on' : 'upload-map-file'}
                  onClick={() => toggle(map.id, index)}
                >
                  {preview.video ? <video src={preview.url} muted /> : <img src={preview.url} alt="" />}
                  {place >= 0 ? <b>{place + 1}</b> : null}
                </button>
              )
            })}
          </div>
        </div>
      ))}
    </div>
  )
}
