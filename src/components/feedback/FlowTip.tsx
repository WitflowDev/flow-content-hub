'use client'

import { Icon } from '@/components/icons'
import { useApp } from '@/state/AppState'

export function FlowTip({
  title,
  linkText = 'Explore possibilities',
  action = 'talk',
}: {
  title: string
  linkText?: string
  action?: string
}) {
  const { openDrawer, navigate } = useApp()

  return (
    <section className="flow-tip card">
      <div className="flow-tip-icon">
        <Icon name="light" />
      </div>
      <div className="tip-copy">
        <div className="eyebrow">Flow Tip</div>
        <h3>{title}</h3>
        <button
          type="button"
          className="link"
          onClick={() => {
            if (action === 'talk') openDrawer()
            else navigate(action, true)
          }}
        >
          {linkText} <Icon name="arrow" />
        </button>
      </div>
      <div className="tip-visual">
        <div className="mini-card">
          <img src="/assets/guide_photos/drone_recording.jpg" alt="" />
        </div>
        <div className="mini-card">
          <img src="/assets/guide_photos/recording_one.jpg" alt="" />
        </div>
        <div className="mini-card">
          <img src="/assets/guide_photos/recording_two.jpg" alt="" />
        </div>
      </div>
    </section>
  )
}
