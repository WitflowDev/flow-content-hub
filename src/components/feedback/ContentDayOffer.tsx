'use client'

import { Icon } from '@/components/icons'
import { useApp } from '@/state/AppState'

export function ContentDayOffer() {
  const { navigate } = useApp()

  return (
    <section className="day-offer card">
      <div>
        <div className="eyebrow">Content Day</div>
        <h3>Book the next production day.</h3>
        <p>One day for new video, photography and posts, delivered in this Hub.</p>
      </div>
      <button type="button" className="btn primary" onClick={() => navigate('/content-day')}>
        Book a Content Day <Icon name="arrow" />
      </button>
    </section>
  )
}
