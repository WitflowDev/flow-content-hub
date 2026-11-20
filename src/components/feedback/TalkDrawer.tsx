'use client'

import { useState } from 'react'
import { usePathname } from 'next/navigation'
import { Icon } from '@/components/icons'
import { submitServiceRequest } from '@/lib/admin/actions'
import { DEFAULT_DIAL_ISO, DIAL_COUNTRIES } from '@/lib/phone/countries'
import type { ServiceName } from '@/lib/requests/services'
import { isServiceName, SERVICE_NAMES } from '@/lib/requests/services'
import { useApp } from '@/state/AppState'
import { useLibrary } from '@/state/Catalog'
import type { MediaItem } from '@/data/types'

function serviceCopy(name: ServiceName): string {
  switch (name) {
    case 'Social Media':
      return 'Copy, calendars, publishing and ongoing management.'
    case 'Video':
      return 'Editing, reels, campaign adaptations and motion.'
    case 'Photography':
      return 'Lifestyle, product, spaces and events.'
    case 'Design & Branding':
      return 'Campaign assets, templates and brand systems.'
    case 'Website':
      return 'Design, development, content and optimisation.'
    case 'Paid Media':
      return 'Campaign strategy, creative and activation.'
    case 'Something else':
      return 'Tell us what you have in mind.'
    default: {
      const unexpected: never = name
      return unexpected
    }
  }
}

function assetOnPath(pathname: string, getMedia: (id: string) => MediaItem | null): MediaItem | null {
  if (!pathname.startsWith('/asset/')) return null
  const id = pathname.slice('/asset/'.length).split('/')[0] ?? ''
  if (!id) return null
  try {
    return getMedia(decodeURIComponent(id))
  } catch {
    return null
  }
}

export function TalkDrawer() {
  const pathname = usePathname()
  const { getMedia } = useLibrary()
  const asset = assetOnPath(pathname, getMedia)
  const { closeDrawer, selectedService, setSelectedService, toast } = useApp()
  const [message, setMessage] = useState('')
  const [phoneIso, setPhoneIso] = useState(DEFAULT_DIAL_ISO)
  const [phoneNumber, setPhoneNumber] = useState('')
  const [sending, setSending] = useState(false)

  async function send() {
    if (sending) return
    if (!selectedService) {
      toast('Choose a service')
      return
    }
    setSending(true)
    const result = await submitServiceRequest({
      service: selectedService,
      message,
      phoneIso,
      phoneNumber,
      assetFileId: asset?.driveFileId ?? '',
    })
    setSending(false)
    if (!result.ok) {
      toast(result.message)
      return
    }
    setMessage('')
    setPhoneNumber('')
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
        <div className="talk-services" role="group" aria-label="Service">
          {SERVICE_NAMES.map((name) => (
            <button
              key={name}
              type="button"
              className={selectedService === name ? 'talk-service on' : 'talk-service'}
              aria-pressed={selectedService === name}
              onClick={() => setSelectedService(name)}
            >
              {name}
            </button>
          ))}
        </div>
        <p className="talk-service-note">
          {isServiceName(selectedService) ? serviceCopy(selectedService) : 'Choose a service, then describe the work.'}
        </p>
        {asset?.driveFileId ? (
          <p className="drawer-asset">
            This request links to <b>{asset.title}</b>
            {asset.collection ? ` in ${asset.collection}` : ''}.
          </p>
        ) : null}
        <div className="field talk-message">
          <label htmlFor="service-message">Tell us what you need</label>
          <textarea
            id="service-message"
            placeholder="E.g. We’d like to turn this collection into a paid campaign…"
            value={message}
            maxLength={1000}
            onChange={(event) => setMessage(event.target.value)}
          />
        </div>
        <div className="field">
          <label htmlFor="service-phone">Phone</label>
          <div className="phone-row">
            <select
              id="service-phone-country"
              aria-label="Country code"
              value={phoneIso}
              onChange={(event) => setPhoneIso(event.target.value)}
            >
              {DIAL_COUNTRIES.map((country) => (
                <option key={country.iso} value={country.iso}>
                  {country.name} +{country.dial}
                </option>
              ))}
            </select>
            <input
              id="service-phone"
              type="tel"
              inputMode="tel"
              placeholder="Optional"
              value={phoneNumber}
              maxLength={20}
              onChange={(event) => setPhoneNumber(event.target.value)}
            />
          </div>
        </div>
        <button type="button" className="btn primary wide" disabled={sending} onClick={() => void send()}>
          Send to Flow <Icon name="arrow" />
        </button>
        <div className="drawer-note">No commitment. We’ll come back to you with the best next step.</div>
      </aside>
    </>
  )
}
