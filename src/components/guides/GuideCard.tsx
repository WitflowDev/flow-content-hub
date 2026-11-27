'use client'

import { useState } from 'react'
import { Icon } from '@/components/icons'
import { TutorialImage } from '@/components/guides/TutorialImage'
import { useApp } from '@/state/AppState'
import type { Guide } from '@/data/types'

export function GuideCard({ guide }: { guide: Guide }) {
  const { openGuide } = useApp()
  const [active, setActive] = useState(false)

  return (
    <button
      type="button"
      className="guide-card card"
      onClick={() => openGuide(guide.id)}
      onPointerEnter={() => setActive(true)}
      onPointerLeave={() => setActive(false)}
      onFocus={() => setActive(true)}
      onBlur={() => setActive(false)}
    >
      <div className="guide-visual">
        <TutorialImage id={guide.id} alt={guide.title} animate="hover" active={active} />
        <span className="duration guide-duration">
          <Icon name="play" />
          {guide.duration}
        </span>
      </div>
      <div className="guide-body">
        <h3>{guide.title}</h3>
        <p>{guide.desc}</p>
        <span className="guide-open">
          Watch guide <Icon name="arrow" />
        </span>
      </div>
    </button>
  )
}
