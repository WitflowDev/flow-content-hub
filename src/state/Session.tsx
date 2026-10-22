'use client'

import { createContext, useContext } from 'react'
import type { ReactNode } from 'react'
import type { AppRole } from '@/lib/auth'

export type SessionProfile = {
  id: string
  name: string
  email: string
  role: AppRole
  onboardingDone: boolean
}

const SessionContext = createContext<SessionProfile | null>(null)

export function SessionProvider({ profile, children }: { profile: SessionProfile; children: ReactNode }) {
  return <SessionContext.Provider value={profile}>{children}</SessionContext.Provider>
}

export function useSession(): SessionProfile {
  const profile = useContext(SessionContext)
  if (!profile) throw new Error('useSession must be used within SessionProvider')
  return profile
}
