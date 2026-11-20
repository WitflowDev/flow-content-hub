'use client'

import { ContentDayBooking } from '@/components/content-day/ContentDayBooking'

export function ContentDayScreen() {
  return (
    <div className="page content-day-page">
      <header className="page-head">
        <div className="page-title">
          <div className="eyebrow">Content Day</div>
          <h1>Book a Content Day.</h1>
          <p>Choose the first day. We confirm it with you before it is booked.</p>
        </div>
      </header>
      <div className="day-landing content-day-embed">
        <div className="package-inclusions">
          <span className="package-intro">IN EACH CONTENT DAY</span>
          <span>09:00 to 18:00</span>
          <span>Up to 5 reels*</span>
          <span>Up to 40 photographs</span>
          <span>Posts, covers and Hub</span>
        </div>
        <ContentDayBooking mode="send" />
        <p className="plan-note">
          *Up to 5 edited reels or 1 short horizontal video per session, and up to 40 edited photographs. Simple covers, ideas and post materials are agreed in the brief. Publishing, social management and ads are not included. Hub access is for viewing and downloading the delivered files.
        </p>
      </div>
    </div>
  )
}
