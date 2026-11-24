'use client'

import { useEffect, useRef } from 'react'
import { FormatCrop } from '@/components/admin/FormatCrop'
import { CENTER_CROP, EXPORT_FORMATS, EXPORT_IDS, pixelSize, type CropFrame, type ExportId } from '@/data/exports'

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

export function blankPhoto(file: File, source?: PhotoDraft): PhotoDraft {
  return {
    key: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    url: URL.createObjectURL(file),
    readyFiles: {},
    makeFormats: source ? [...source.makeFormats] : [...EXPORT_IDS],
    cropFrames: {},
    customs: source
      ? source.customs.map((row) => ({ ...row, key: `${file.name}-${row.key}`, frame: CENTER_CROP }))
      : [],
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
  onReplace,
  onRemove,
}: {
  photos: PhotoDraft[]
  mode: 'ready' | 'make'
  uploading: boolean
  onChange: (photo: PhotoDraft) => void
  onReplace: (photos: PhotoDraft[]) => void
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
      <SharedFormats photos={photos} mode={mode} uploading={uploading} onReplace={onReplace} />
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
            customTemplate={photos.find((item) => item.customs.length > 0)?.customs ?? []}
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
  customTemplate,
  onChange,
  onRemove,
}: {
  photo: PhotoDraft
  index: number
  total: number
  mode: 'ready' | 'make'
  uploading: boolean
  customTemplate: CustomSizeDraft[]
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
      <SlideFormats photo={photo} mode={mode} uploading={uploading} customTemplate={customTemplate} onChange={onChange} />
    </article>
  )
}

function SharedFormats({
  photos,
  mode,
  uploading,
  onReplace,
}: {
  photos: PhotoDraft[]
  mode: 'ready' | 'make'
  uploading: boolean
  onReplace: (photos: PhotoDraft[]) => void
}) {
  const template = photos.find((photo) => photo.customs.length > 0)?.customs ?? []
  const allCustom = photos.every((photo) => photo.customs.length > 0)
  const someCustom = photos.some((photo) => photo.customs.length > 0)
  if (!photos[0]) return null

  function toggleFormat(id: ExportId) {
    const allOn = photos.every((photo) => photo.makeFormats.includes(id))
    onReplace(
      photos.map((photo) => {
        const makeFormats = allOn
          ? photo.makeFormats.filter((item) => item !== id)
          : photo.makeFormats.includes(id)
            ? photo.makeFormats
            : [...photo.makeFormats, id]
        return {
          ...photo,
          makeFormats,
          readyFiles: makeFormats.includes(id) ? photo.readyFiles : { ...photo.readyFiles, [id]: null },
        }
      }),
    )
  }

  function copyCustoms(rows: CustomSizeDraft[], photo: PhotoDraft): CustomSizeDraft[] {
    return rows.map((row, index) => {
      const existing = photo.customs[index]
      return {
        key: existing?.key ?? `${photo.key}-${row.key}`,
        name: row.name,
        width: row.width,
        height: row.height,
        frame: existing?.frame ?? CENTER_CROP,
      }
    })
  }

  function toggleCustom() {
    if (allCustom) {
      onReplace(photos.map((photo) => ({ ...photo, customs: [] })))
      return
    }
    const rows = template.length > 0 ? template : [blankCustom()]
    onReplace(photos.map((photo) => ({ ...photo, customs: copyCustoms(rows, photo) })))
  }

  function editCustoms(rows: CustomSizeDraft[]) {
    onReplace(
      photos.map((photo) => (photo.customs.length === 0 ? photo : { ...photo, customs: copyCustoms(rows, photo) })),
    )
  }

  return (
    <div className="shared-formats">
      <p>Set the formats for every photo. Each photo can still turn a format on or off.</p>
      <div className="format-choice">
        {EXPORT_FORMATS.map((format) => {
          const count = photos.filter((photo) => photo.makeFormats.includes(format.id)).length
          return (
            <FormatCheck
              key={format.id}
              label={format.label}
              checked={count === photos.length}
              indeterminate={count > 0 && count < photos.length}
              disabled={uploading}
              onChange={() => toggleFormat(format.id)}
            />
          )
        })}
        {mode === 'make' ? (
          <FormatCheck
            label="Custom"
            checked={allCustom}
            indeterminate={someCustom && !allCustom}
            disabled={uploading}
            onChange={toggleCustom}
          />
        ) : null}
      </div>
      {mode === 'make'
        ? template.map((row, index) => (
            <div key={row.key} className="custom-size">
              <label className="field">
                <span>Name</span>
                <input
                  value={row.name}
                  disabled={uploading}
                  maxLength={40}
                  placeholder="Lookbook"
                  onChange={(event) =>
                    editCustoms(template.map((item, itemIndex) => (itemIndex === index ? { ...item, name: event.target.value } : item)))
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
                    editCustoms(template.map((item, itemIndex) => (itemIndex === index ? { ...item, width: event.target.value } : item)))
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
                    editCustoms(template.map((item, itemIndex) => (itemIndex === index ? { ...item, height: event.target.value } : item)))
                  }
                />
              </label>
              <button
                type="button"
                className="text-btn"
                disabled={uploading}
                onClick={() => editCustoms(template.filter((_, itemIndex) => itemIndex !== index))}
              >
                Remove
              </button>
            </div>
          ))
        : null}
      {mode === 'make' && template.length > 0 ? (
        <button
          type="button"
          className="btn soft"
          disabled={uploading || template.length >= 6}
          onClick={() => editCustoms([...template, blankCustom()])}
        >
          Add another size
        </button>
      ) : null}
    </div>
  )
}

function FormatCheck({
  label,
  checked,
  indeterminate = false,
  disabled,
  onChange,
}: {
  label: string
  checked: boolean
  indeterminate?: boolean
  disabled: boolean
  onChange: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (inputRef.current) inputRef.current.indeterminate = indeterminate
  }, [indeterminate])

  return (
    <label>
      <input ref={inputRef} type="checkbox" checked={checked} disabled={disabled} onChange={onChange} />
      <span>{label}</span>
    </label>
  )
}

function SlideFormats({
  photo,
  mode,
  uploading,
  customTemplate,
  onChange,
}: {
  photo: PhotoDraft
  mode: 'ready' | 'make'
  uploading: boolean
  customTemplate: CustomSizeDraft[]
  onChange: (photo: PhotoDraft) => void
}) {
  function toggleFormat(id: ExportId) {
    const makeFormats = photo.makeFormats.includes(id)
      ? photo.makeFormats.filter((item) => item !== id)
      : [...photo.makeFormats, id]
    onChange({
      ...photo,
      makeFormats,
      readyFiles: makeFormats.includes(id) ? photo.readyFiles : { ...photo.readyFiles, [id]: null },
    })
  }

  function toggleCustom() {
    if (photo.customs.length > 0) {
      onChange({ ...photo, customs: [] })
      return
    }
    const rows = customTemplate.length > 0 ? customTemplate : [blankCustom()]
    onChange({
      ...photo,
      customs: rows.map((row) => ({ ...row, key: `${photo.key}-${row.key}`, frame: CENTER_CROP })),
    })
  }

  const chosen = EXPORT_FORMATS.filter((format) => photo.makeFormats.includes(format.id))
  const choices = (
    <div className="format-choice">
      {EXPORT_FORMATS.map((format) => (
        <FormatCheck
          key={format.id}
          label={format.label}
          checked={photo.makeFormats.includes(format.id)}
          disabled={uploading}
          onChange={() => toggleFormat(format.id)}
        />
      ))}
      {mode === 'make' ? (
        <FormatCheck label="Custom" checked={photo.customs.length > 0} disabled={uploading} onChange={toggleCustom} />
      ) : null}
    </div>
  )

  switch (mode) {
    case 'ready':
      return (
        <>
          {choices}
          {chosen.map((format) => (
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
          {choices}
          {chosen.map((format) => (
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
