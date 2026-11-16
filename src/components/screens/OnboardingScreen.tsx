'use client'

import { useState } from 'react'
import { BusyButton } from '@/components/feedback/BusyButton'
import { Icon } from '@/components/icons'
import { FlowTip } from '@/components/feedback/FlowTip'
import { TutorialImage } from '@/components/guides/TutorialImage'
import { createClient } from '@/lib/supabase/client'
import { useApp } from '@/state/AppState'
import { useSession } from '@/state/Session'

const steps = [
  {
    step: '1',
    gif: 'filters',
    title: 'Browse your content',
    desc: 'Find every photo, video and design asset with visual search and filters.',
  },
  {
    step: '2',
    gif: 'collections',
    title: 'Open collections',
    desc: 'Browse content grouped by campaign, event or Content Day.',
  },
  {
    step: '3',
    gif: 'download',
    title: 'Download in seconds',
    desc: 'Download one asset or a complete collection whenever you need it.',
  },
]

export function OnboardingScreen() {
  const { navigate, toast } = useApp()
  const profile = useSession()
  const [pending, setPending] = useState<'start' | 'skip' | null>(null)

  async function finish(action: 'start' | 'skip') {
    if (pending) return
    setPending(action)
    const supabase = createClient()
    const { error } = await supabase.from('profiles').update({ onboarding_done: true }).eq('id', profile.id)
    if (error) {
      setPending(null)
      toast('Could not save your progress')
      return
    }
    navigate('/home')
  }

  return (
    <div className="page onboarding-page">
      <div className="onboarding-hero">
        <div className="onboarding-copy">
          <div className="eyebrow">Get started</div>
          <h1>Welcome to your Flow Content Hub.</h1>
          <p>Everything Flow creates for your brand, organised in one visual library. Three quick things and you’re ready.</p>
        </div>
        <div className="onboarding-collage">
          <img src="/assets/media/cliffs_hd.jpg" alt="" />
          <img src="/assets/media/palms_hd.jpg" alt="" />
          <img src="/assets/media/portrait_hd.jpg" alt="" />
          <span>
            Your content,
            <br />
            all in one place.
          </span>
        </div>
      </div>
      <div className="onboarding-grid">
        {steps.map((item) => (
          <article className="onboard-card card" key={item.step}>
            <div className="tutorial-frame">
              <TutorialImage id={item.gif} alt={item.title} />
            </div>
            <div className="onboard-copy-row">
              <span className="step">{item.step}</span>
              <div>
                <h3>{item.title}</h3>
                <p>{item.desc}</p>
              </div>
            </div>
          </article>
        ))}
      </div>
      <div className="onboard-actions">
        <BusyButton
          className="btn primary large"
          pending={pending === 'start'}
          pendingLabel="Opening your library…"
          disabled={pending !== null}
          onClick={() => void finish('start')}
        >
          Let’s get started <Icon name="arrow" />
        </BusyButton>
        <button type="button" className="text-btn" onClick={() => void finish('skip')} disabled={pending !== null}>
          {pending === 'skip' ? 'Skipping…' : 'Skip for now'}
        </button>
      </div>
      <FlowTip title="Your content stays at the centre. Flow can also help with the next step when you need it." />
    </div>
  )
}
