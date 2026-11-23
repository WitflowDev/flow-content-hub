'use client'

import { useRef } from 'react'
import { FormatCrop } from '@/components/admin/FormatCrop'
import { CENTER_CROP, EXPORT_FORMATS, pixelSize, type CropFrame, type ExportId } from '@/data/exports'

export type CustomSizeDraft = {
  key: string
  name: string
  width: string
  height: string
  frame: CropFrame
}

export type PhotoDraft = {
  key: string
  file: File
  url: string
  readyFiles: Partial<Record<ExportId, File | null>>
  makeFormats: ExportId[]
  cropFrames: Partial<Record<ExportId, CropFrame>>
  customs: CustomSizeDraft[]
}

export type ReadyCustomSize = {
  name: string
  width: number
  height: number
  frame: CropFrame
}

export function blankPhoto(file: File): PhotoDraft {
  return {
    key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    url: URL.createObjectURL(file),
    readyFiles: {},
    makeFormats: [],
    cropFrames: {},
    customs: [],
  }
}

export function readCustomSize(row: CustomSizeDraft): ReadyCustomSize | { error: string } | null {
  const name = row.name.trim()
  const widthText = row.width.trim()
  const heightText = row.height.trim()
  if (!name && !widthText && !heightText) return null
  if (!name) return { error: 'Name this format.' }
  const width = pixelSize(widthText)
  const height = pixelSize(heightText)
  if (!width || !height) return { error: `${name} needs a width and a height between 32 and 4096.` }
  return { name, width, height, frame: row.frame }
}

function blankCustom(): CustomSizeDraft {
  return {
    key: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    name: '',
    width: '',
    height: '',
    frame: CENTER_CROP,
  }
}

export function PhotoRail({
  photos,
  mode,
  uploading,
  onChange,
  onRemove,
}: {
  photos: PhotoDraft[]
  mode: 'ready' | 'make'
  uploading: boolean
  onChange: (photo: PhotoDraft) => void
  onRemove: (key: string) => void
}) {
  const railRef = useRef<HTMLDivElement>(null)

  function scrollRail(direction: -1 | 1) {
    const rail = railRef.current
    if (!rail) return
    const slide = rail.querySelector('.photo-slide')
    const amount = slide instanceof HTMLElement ? slide.getBoundingClientRect().width + 16 : rail.clientWidth
    rail.scrollBy({ left: direction * amount, behavior: 'smooth' })
  }

  if (photos.length === 0) return null

  return (
    <div className="photo-rail-wrap">
      <div className="photo-rail-nav">
        <span>
          {photos.length === 1 ? '1 photo' : `${photos.length} photos`}
        </span>
        {photos.length > 1 ? (
          <div>
            <button type="button" className="text-btn" disabled={uploading} onClick={() => scrollRail(-1)}>
              Previous photo
            </button>
            <button type="button" className="text-btn" disabled={uploading} onClick={() => scrollRail(1)}>
              Next photo
            </button>
          </div>
        ) : null}
      </div>
      <div className="photo-rail" ref={railRef}>
        {photos.map((photo, index) => (
          <PhotoSlide
            key={photo.key}
            photo={photo}
            index={index}
            total={photos.length}
            mode={mode}
            uploading={uploading}
            onChange={onChange}
            onRemove={() => onRemove(photo.key)}
          />
        ))}
      </div>
    </div>
  )
}

function PhotoSlide({
  photo,
  index,
  total,
  mode,
  uploading,
  onChange,
  onRemove,
}: {
  photo: PhotoDraft
  index: number
  total: number
  mode: 'ready' | 'make'
  uploading: boolean
  onChange: (photo: PhotoDraft) => void
  onRemove: () => void
}) {
  return (
    <article className="photo-slide">
      <header className="photo-slide-head">
        <img src={photo.url} alt="" />
        <div>
          <b>
            Photo {index + 1} of {total}
          </b>
          <small>{photo.file.name}</small>
        </div>
        <button type="button" className="text-btn" disabled={uploading} onClick={onRemove}>
          Remove
        </button>
      </header>
      <SlideFormats photo={photo} mode={mode} uploading={uploading} onChange={onChange} />
    </article>
  )
}

function SlideFormats({
  photo,
  mode,
  uploading,
  onChange,
}: {
  photo: PhotoDraft
  mode: 'ready' | 'make'
  uploading: boolean
  onChange: (photo: PhotoDraft) => void
}) {
  switch (mode) {
    case 'ready':
      return (
        <>
          <p>Upload each format already at the right size.</p>
          {EXPORT_FORMATS.map((format) => (
            <label key={format.id} className="format-upload">
              <span>
                <b>{format.label}</b>
                <small>{format.note}</small>
              </span>
              <input
                type="file"
                accept="image/*"
                disabled={uploading}
                onChange={(event) =>
                  onChange({
                    ...photo,
                    readyFiles: { ...photo.readyFiles, [format.id]: event.target.files?.[0] ?? null },
                  })
                }
              />
            </label>
          ))}
        </>
      )
    case 'make':
      return (
        <>
          <p>Choose the formats to make from this photo. Drag each preview until the crop looks right.</p>
          <div className="format-choice">
            {EXPORT_FORMATS.map((format) => (
              <label key={format.id}>
                <input
                  type="checkbox"
                  checked={photo.makeFormats.includes(format.id)}
                  disabled={uploading}
                  onChange={() =>
                    onChange({
                      ...photo,
                      makeFormats: photo.makeFormats.includes(format.id)
                        ? photo.makeFormats.filter((id) => id !== format.id)
                        : [...photo.makeFormats, format.id],
                    })
                  }
                />
                <span>{format.label}</span>
              </label>
            ))}
            <label>
              <input
                type="checkbox"
                checked={photo.customs.length > 0}
                disabled={uploading}
                onChange={() =>
                  onChange({
                    ...photo,
                    customs: photo.customs.length > 0 ? [] : [blankCustom()],
                  })
                }
              />
              <span>Custom</span>
            </label>
          </div>
          {photo.customs.map((row) => (
            <div key={row.key} className="custom-size">
              <label className="field">
                <span>Name</span>
                <input
                  value={row.name}
                  disabled={uploading}
                  maxLength={40}
                  placeholder="Lookbook"
                  onChange={(event) =>
                    onChange({
                      ...photo,
                      customs: photo.customs.map((item) => (item.key === row.key ? { ...item, name: event.target.value } : item)),
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Width</span>
                <input
                  inputMode="numeric"
                  value={row.width}
                  disabled={uploading}
                  placeholder="1080"
                  onChange={(event) =>
                    onChange({
                      ...photo,
                      customs: photo.customs.map((item) => (item.key === row.key ? { ...item, width: event.target.value } : item)),
                    })
                  }
                />
              </label>
              <label className="field">
                <span>Height</span>
                <input
                  inputMode="numeric"
                  value={row.height}
                  disabled={uploading}
                  placeholder="1350"
                  onChange={(event) =>
                    onChange({
                      ...photo,
                      customs: photo.customs.map((item) => (item.key === row.key ? { ...item, height: event.target.value } : item)),
                    })
                  }
                />
              </label>
              <button
                type="button"
                className="text-btn"
                disabled={uploading}
                onClick={() => onChange({ ...photo, customs: photo.customs.filter((item) => item.key !== row.key) })}
              >
                Remove
              </button>
            </div>
          ))}
          {photo.customs.length > 0 ? (
            <button
              type="button"
              className="btn soft"
              disabled={uploading || photo.customs.length >= 6}
              onClick={() => onChange({ ...photo, customs: [...photo.customs, blankCustom()] })}
            >
              Add another size
            </button>
          ) : null}
          {EXPORT_FORMATS.filter((format) => photo.makeFormats.includes(format.id)).map((format) => (
            <FormatCrop
              key={format.id}
              src={photo.url}
              width={format.width}
              height={format.height}
              label={format.label}
              frame={photo.cropFrames[format.id] ?? CENTER_CROP}
              onChange={(frame) => onChange({ ...photo, cropFrames: { ...photo.cropFrames, [format.id]: frame } })}
            />
          ))}
          {photo.customs.map((row) => {
            const size = readCustomSize(row)
            if (!size || 'error' in size) return null
            return (
              <FormatCrop
                key={`${row.key}-crop`}
                src={photo.url}
                width={size.width}
                height={size.height}
                label={size.name}
                frame={row.frame}
                onChange={(frame) =>
                  onChange({
                    ...photo,
                    customs: photo.customs.map((item) => (item.key === row.key ? { ...item, frame } : item)),
                  })
                }
              />
            )
          })}
        </>
      )
    default: {
      const unreachable: never = mode
      return unreachable
    }
  }
}
