'use client'

import { useSession } from '@/state/Session'

export function ClientMark() {
  const profile = useSession()
  if (!profile.logoFileId) return null
  const label = profile.companyName.trim() || profile.name.trim() || 'Company'

  return (
    <span className="client-mark client-mark-rail">
      <img src={`/api/brand/logo?v=${encodeURIComponent(profile.logoFileId)}`} alt={`${label} logo`} />
    </span>
  )
}
