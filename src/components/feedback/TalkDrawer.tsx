'use client'

import { Icon } from '@/components/icons'
import type { IconName } from '@/components/icons'
import { useApp } from '@/state/AppState'

const services: Array<{ name: string; description: string; icon: IconName }> = [
  { name: 'Social Media', description: 'Copy, calendars, publishing and ongoing management.', icon: 'folder' },
  { name: 'Video', description: 'Editing, reels, campaign adaptations and motion.', icon: 'play' },
  { name: 'Photography', description: 'Lifestyle, product, spaces and events.', icon: 'layers' },
  { name: 'Design & Branding', description: 'Campaign assets, templates and brand systems.', icon: 'grid' },
  { name: 'Website', description: 'Design, development, content and optimisation.', icon: 'home' },
  { name: 'Paid Media', description: 'Campaign strategy, creative and activation.', icon: 'bell' },
  { name: 'Something else', description: 'Tell us what you have in mind.', icon: 'chat' },
]

export function TalkDrawer() {
  const { closeDrawer, selectedService, setSelectedService, toast } = useApp()

  function send() {
    closeDrawer()
    toast('Message sent to Flow', 'success')
  }

  return (
    <>
      <div className="backdrop" onClick={closeDrawer} />
      <aside className="drawer">
        <div className="drawer-head">
          <div>
            <div className="eyebrow">Made by Flow</div>
            <h2>Talk to Flow</h2>
            <p>Need something beyond your content library? Tell us what you’re working on and we’ll point you to the right next step.</p>
          </div>
          <button type="button" className="close" onClick={closeDrawer}>
            <Icon name="close" />
          </button>
        </div>
        <div className="service-list">
          {services.map((service) => (
            <button
              key={service.name}
              type="button"
              className={selectedService === service.name ? 'service-option selected' : 'service-option'}
              onClick={() => setSelectedService(service.name)}
            >
              <span className="service-icon">
                <Icon name={service.icon} />
              </span>
              <span>
                <strong>{service.name}</strong>
                <small>{service.description}</small>
              </span>
              <span>→</span>
            </button>
          ))}
        </div>
        <div className="field">
          <label htmlFor="service-message">Tell us what you need</label>
          <textarea id="service-message" placeholder="E.g. We’d like to turn this collection into a paid campaign…" />
        </div>
        <button type="button" className="btn primary wide" onClick={send}>
          Send to Flow <Icon name="arrow" />
        </button>
        <div className="drawer-note">No commitment. We’ll come back to you with the best next step.</div>
      </aside>
    </>
  )
}
