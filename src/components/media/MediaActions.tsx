'use client'

import { useEffect, useRef, useState } from 'react'
import type { MouseEvent } from 'react'
import { Icon } from '@/components/icons'
import type { MediaItem } from '@/data/types'

type MenuPlace = {
  top: number
  left: number
  above: boolean
}

export function MediaActions({ item }: { item: MediaItem }) {
  const buttonRef = useRef<HTMLButtonElement>(null)
  const [open, setOpen] = useState(false)
  const [inCard, setInCard] = useState(false)
  const [place, setPlace] = useState<MenuPlace | null>(null)
  const driveFileId = item.driveFileId

  useEffect(() => {
    if (!open) return
    function closeOnOutside(event: PointerEvent) {
      const target = event.target
      const wrap = buttonRef.current?.parentElement
      if (target instanceof Node && wrap?.contains(target)) return
      setOpen(false)
    }
    function closeOnKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setOpen(false)
    }
    function closeOnScroll() {
      setOpen(false)
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnKey)
    window.addEventListener('scroll', closeOnScroll, true)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnKey)
      window.removeEventListener('scroll', closeOnScroll, true)
    }
  }, [open])

  function toggle(event: MouseEvent<HTMLButtonElement>) {
    event.stopPropagation()
    if (!driveFileId) return
    const card = Boolean(event.currentTarget.closest('.media-card'))
    setInCard(card)
    if (!card) {
      const rect = event.currentTarget.getBoundingClientRect()
      const above = window.innerHeight - rect.bottom < 72
      setPlace({ top: above ? rect.top - 8 : rect.bottom + 8, left: rect.right, above })
    }
    setOpen((current) => !current)
  }

  return (
    <div className="kebab-wrap" onClick={(event) => event.stopPropagation()}>
      <button
        ref={buttonRef}
        type="button"
        className="kebab"
        aria-label="More options"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={toggle}
      >
        •••
      </button>
      {open && driveFileId && (inCard || place) ? (
        <div
          className="kebab-menu"
          role="menu"
          style={
            place
              ? {
                  top: place.top,
                  left: place.left,
                  transform: place.above ? 'translate(-100%, -100%)' : 'translateX(-100%)',
                }
              : undefined
          }
        >
          <a role="menuitem" href={`/api/drive/files/${driveFileId}`} download={item.file} onClick={() => setOpen(false)}>
            <Icon name="download" />
            Download
          </a>
        </div>
      ) : null}
    </div>
  )
}
