'use client'

import { Icon } from '@/components/icons'
import { TutorialImage } from '@/components/guides/TutorialImage'
import { guides } from '@/data/guides'
import { useApp } from '@/state/AppState'

export function GuideModal({ id }: { id: string }) {
  const { closeGuide } = useApp()
  const guide = guides.find((item) => item.id === id) ?? guides[0]
  if (!guide) return null

  return (
    <>
      <div className="modal-backdrop" onClick={closeGuide} />
      <section className="guide-modal card">
        <button type="button" className="modal-close" onClick={closeGuide}>
          <Icon name="close" />
        </button>
        <div className="guide-modal-media">
          <TutorialImage id={guide.id} alt={guide.title} />
        </div>
        <div className="guide-modal-copy">
          <div className="eyebrow">Quick guide · {guide.duration}</div>
          <h2>{guide.title}</h2>
          <p>{guide.desc}</p>
          <ol>
            {guide.steps.map((step) => (
              <li key={step}>{step}</li>
            ))}
          </ol>
          <button type="button" className="btn soft" onClick={closeGuide}>
            Got it
          </button>
        </div>
      </section>
    </>
  )
}
