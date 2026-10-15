'use client'

import { Icon } from '@/components/icons'
import { TutorialImage } from '@/components/guides/TutorialImage'
import { useApp } from '@/state/AppState'
import type { Guide } from '@/data/types'

export function GuideCard({ guide }: { guide: Guide }) {
  const { openGuide } = useApp()

  return (
    <button type="button" className="guide-card card" onClick={() => openGuide(guide.id)}>
      <div className="guide-visual">
        <TutorialImage id={guide.id} alt={guide.title} />
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
