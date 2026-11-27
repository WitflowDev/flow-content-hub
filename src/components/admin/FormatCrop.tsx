'use client'

import { useEffect, useRef, useState } from 'react'
import type { PointerEvent } from 'react'
import { coverPlacement, type CropFrame } from '@/data/exports'

export function FormatCrop({
  src,
  width,
  height,
  label,
  frame,
  disabled = false,
  onChange,
}: {
  src: string
  width: number
  height: number
  label: string
  frame: CropFrame
  disabled?: boolean
  onChange: (frame: CropFrame) => void
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const imageRef = useRef<HTMLImageElement | null>(null)
  const drag = useRef<{ x: number; y: number; frame: CropFrame } | null>(null)
  const [ready, setReady] = useState(0)

  useEffect(() => {
    const image = new Image()
    image.onload = () => {
      imageRef.current = image
      setReady((count) => count + 1)
    }
    image.src = src
    return () => {
      image.onload = null
    }
  }, [src])

  useEffect(() => {
    const image = imageRef.current
    const canvas = canvasRef.current
    if (!image || !canvas || image.naturalWidth === 0) return
    const maxWidth = 460
    const boxHeight = Math.min(300, Math.round(maxWidth * (height / width)))
    const boxWidth = Math.round(boxHeight * (width / height))
    canvas.width = boxWidth
    canvas.height = boxHeight
    const context = canvas.getContext('2d')
    if (!context) return
    const place = coverPlacement(image.naturalWidth, image.naturalHeight, boxWidth, boxHeight, frame)
    context.clearRect(0, 0, boxWidth, boxHeight)
    context.drawImage(image, place.x, place.y, place.width, place.height)
  }, [ready, frame, width, height])

  function onPointerDown(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, frame }
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    const start = drag.current
    const canvas = canvasRef.current
    const image = imageRef.current
    if (!start || !canvas || !image || canvas.clientWidth === 0 || canvas.clientHeight === 0 || image.naturalWidth === 0) return
    const place = coverPlacement(image.naturalWidth, image.naturalHeight, canvas.width, canvas.height, start.frame)
    const scaleX = canvas.width / canvas.clientWidth
    const scaleY = canvas.height / canvas.clientHeight
    const dx = ((event.clientX - start.x) * scaleX) / Math.max(place.width, 1)
    const dy = ((event.clientY - start.y) * scaleY) / Math.max(place.height, 1)
    const minX = canvas.width / (2 * Math.max(place.width, 1))
    const maxX = 1 - minX
    const minY = canvas.height / (2 * Math.max(place.height, 1))
    const maxY = 1 - minY
    onChange({
      x: Math.min(maxX, Math.max(minX, start.frame.x - dx)),
      y: Math.min(maxY, Math.max(minY, start.frame.y - dy)),
      zoom: start.frame.zoom,
    })
  }

  function onPointerUp() {
    drag.current = null
  }

  return (
    <div className="format-crop">
      <b>{label}</b>
      <canvas
        ref={canvasRef}
        aria-label={`${label} crop preview`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      />
      <label>
        <span>Zoom</span>
        <input
          type="range"
          min={1}
          max={2.5}
          step={0.01}
          disabled={disabled}
          value={frame.zoom}
          onChange={(event) => onChange({ ...frame, zoom: Number(event.target.value) })}
        />
      </label>
      <small>Drag the photo and use the slider until the crop looks right.</small>
    </div>
  )
}
