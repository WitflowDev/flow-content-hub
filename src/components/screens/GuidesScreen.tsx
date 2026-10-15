'use client'

import { FlowTip } from '@/components/feedback/FlowTip'
import { GuideCard } from '@/components/guides/GuideCard'
import { guides } from '@/data/guides'

export function GuidesScreen() {
  return (
    <div className="page guides-page">
      <header className="page-head">
        <div className="page-title">
          <div className="eyebrow">Guides</div>
          <h1>Tips & Guides</h1>
          <p>Short, visual help for using the Hub and getting more from your content.</p>
        </div>
      </header>
      <div className="guide-grid guides-full">
        {guides
          .filter((guide) => guide.id !== 'use-content')
          .map((guide) => (
            <GuideCard key={guide.id} guide={guide} />
          ))}
      </div>
      <FlowTip
        title="Need help beyond the guides? We can support the content, campaign or website around these assets."
        linkText="Talk to Flow"
      />
    </div>
  )
}
