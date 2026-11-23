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
  onChange,
}: {
  src: string
  width: number
  height: number
  label: string
  frame: CropFrame
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
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = { x: event.clientX, y: event.clientY, frame }
  }

  function onPointerMove(event: PointerEvent<HTMLCanvasElement>) {
    const start = drag.current
    const canvas = canvasRef.current
    if (!start || !canvas || canvas.clientWidth === 0) return
    const dx = (event.clientX - start.x) / canvas.clientWidth
    const dy = (event.clientY - start.y) / canvas.clientHeight
    onChange({
      x: start.frame.x - dx / Math.max(start.frame.zoom, 1),
      y: start.frame.y - dy / Math.max(start.frame.zoom, 1),
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
          value={frame.zoom}
          onChange={(event) => onChange({ ...frame, zoom: Number(event.target.value) })}
        />
      </label>
      <small>Drag the photo and use the slider until the crop looks right.</small>
    </div>
  )
}
